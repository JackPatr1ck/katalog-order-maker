import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { listPaystackBanks, saveVendorPayout, getVendorPayout } from '@/lib/payments.functions';

export const Route = createFileRoute('/dashboard/settings/payouts')({
  component: PayoutsPage,
});

interface Bank { name: string; code: string; }

function PayoutsPage() {
  const listBanks = useServerFn(listPaystackBanks);
  const savePayout = useServerFn(saveVendorPayout);
  const loadPayout = useServerFn(getVendorPayout);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currentAccountName, setCurrentAccountName] = useState<string | null>(null);
  const [currentSubaccount, setCurrentSubaccount] = useState<string | null>(null);
  const [feePercent, setFeePercent] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [b, p] = await Promise.all([listBanks(), loadPayout()]);
        setBanks(b);
        if (p) {
          setBankCode(p.bank_code ?? '');
          setAccountNumber(p.account_number ?? '');
          setCurrentAccountName(p.account_name ?? null);
          setCurrentSubaccount(p.paystack_subaccount_code ?? null);
          setFeePercent(Number(p.percentage_charge ?? 2));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load payout details');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bankName = useMemo(
    () => banks.find((b) => b.code === bankCode)?.name ?? '',
    [banks, bankCode],
  );

  async function submit() {
    if (!bankCode || !accountNumber) { toast.error('Bank and account number are required'); return; }
    setSaving(true);
    try {
      const res = await savePayout({ data: { bank_code: bankCode, bank_name: bankName, account_number: accountNumber } });
      setCurrentAccountName(res.account_name);
      setCurrentSubaccount(res.subaccount_code);
      toast.success(`Verified: ${res.account_name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-3.5" /> Back to Settings
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add the Nigerian bank account where Katalog will settle your payments.
          Only NGN payments are supported at this time.
        </p>
      </div>

      {currentSubaccount && currentAccountName && (
        <Card className="p-5 shadow-card bg-success/5 border-success/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Payouts active</p>
              <p className="text-muted-foreground">
                Settling to <strong>{currentAccountName}</strong> · {feePercent}% platform fee per transaction
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 shadow-card space-y-4">
        <div className="space-y-2">
          <Label>Bank</Label>
          <select
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); setCurrentAccountName(null); }}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a bank</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Account number (10 digits)</Label>
          <Input
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setCurrentAccountName(null); }}
            placeholder="0123456789"
          />
        </div>

        <Button onClick={submit} disabled={saving} className="shadow-elegant gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {currentSubaccount ? 'Update payout account' : 'Verify & activate payouts'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Katalog uses Paystack subaccounts. When a buyer pays, Paystack automatically splits the amount —
          you receive {(100 - feePercent).toFixed(0)}% directly into this bank account and Katalog retains {feePercent}%.
        </p>
      </Card>
    </div>
  );
}
