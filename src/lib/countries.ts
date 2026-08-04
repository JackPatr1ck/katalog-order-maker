export interface Country {
  code: string;
  name: string;
  currency: string;
  dial: string;
}

/** Supported countries with their billing currency and dial code. */
export const COUNTRIES: Country[] = [
  { code: "NG", name: "Nigeria", currency: "NGN", dial: "+234" },
  { code: "GH", name: "Ghana", currency: "GHS", dial: "+233" },
  { code: "KE", name: "Kenya", currency: "KES", dial: "+254" },
  { code: "ZA", name: "South Africa", currency: "ZAR", dial: "+27" },
  { code: "US", name: "United States", currency: "USD", dial: "+1" },
  { code: "GB", name: "United Kingdom", currency: "GBP", dial: "+44" },
  { code: "CA", name: "Canada", currency: "CAD", dial: "+1" },
  { code: "IE", name: "Ireland", currency: "EUR", dial: "+353" },
  { code: "DE", name: "Germany", currency: "EUR", dial: "+49" },
  { code: "FR", name: "France", currency: "EUR", dial: "+33" },
  { code: "IN", name: "India", currency: "INR", dial: "+91" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", dial: "+971" },
  { code: "BR", name: "Brazil", currency: "BRL", dial: "+55" },
  { code: "MX", name: "Mexico", currency: "MXN", dial: "+52" },
];

export function currencyForCountry(code?: string | null): string {
  return COUNTRIES.find((c) => c.code === code)?.currency ?? "USD";
}

export function dialForCountry(code?: string | null): string {
  return COUNTRIES.find((c) => c.code === code)?.dial ?? "";
}

export function countryName(code?: string | null): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? "";
}
