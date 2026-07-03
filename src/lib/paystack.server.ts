// Server-only Paystack API helpers. Never import from client code.
const PAYSTACK_BASE = 'https://api.paystack.co';

function key(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return k;
}

async function ps<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: unknown };
  if (!res.ok || json.status === false) {
    throw new Error(json.message || `Paystack error (${res.status})`);
  }
  return json as T;
}

export interface PaystackBank { name: string; code: string; currency: string; }

export async function listBanks(country = 'nigeria'): Promise<PaystackBank[]> {
  const r = await ps<{ data: PaystackBank[] }>(`/bank?country=${encodeURIComponent(country)}&perPage=100`);
  return r.data;
}

export async function resolveAccount(account_number: string, bank_code: string) {
  const r = await ps<{ data: { account_number: string; account_name: string } }>(
    `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
  );
  return r.data;
}

export interface SubaccountResult { subaccount_code: string; account_name: string; }

export async function createSubaccount(input: {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number; // platform fee
  primary_contact_name?: string;
  primary_contact_phone?: string;
}): Promise<SubaccountResult> {
  const r = await ps<{ data: { subaccount_code: string; account_name: string } }>(
    `/subaccount`,
    { method: 'POST', body: JSON.stringify({ ...input, settlement_bank: input.bank_code }) },
  );
  return r.data;
}

export async function updateSubaccount(code: string, input: {
  business_name?: string;
  bank_code?: string;
  account_number?: string;
  percentage_charge?: number;
}) {
  const body: Record<string, unknown> = { ...input };
  if (input.bank_code) body.settlement_bank = input.bank_code;
  await ps(`/subaccount/${code}`, { method: 'PUT', body: JSON.stringify(body) });
}

export interface InitTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(input: {
  email: string;
  amount_kobo: number;
  reference: string;
  subaccount: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<InitTransactionResult> {
  const r = await ps<{ data: InitTransactionResult }>(`/transaction/initialize`, {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amount_kobo,
      reference: input.reference,
      subaccount: input.subaccount,
      callback_url: input.callback_url,
      metadata: input.metadata,
      bearer: 'subaccount', // fees deducted from the vendor's subaccount
    }),
  });
  return r.data;
}

export async function verifyTransaction(reference: string) {
  const r = await ps<{ data: { status: string; amount: number; reference: string; paid_at: string; customer: { email: string } } }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return r.data;
}
