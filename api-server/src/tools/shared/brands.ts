export const BRAND_DOMAINS: Record<string, string[]> = {
  apple: ["apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com", "office.com"],
  google: ["google.com", "gmail.com", "youtube.com"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.de"],
  paypal: ["paypal.com"],
  netflix: ["netflix.com"],
  meta: ["meta.com", "facebook.com", "instagram.com"],
  chase: ["chase.com", "jpmorganchase.com"],
  bankofamerica: ["bankofamerica.com", "bofa.com"],
  wells: ["wellsfargo.com"],
  irs: ["irs.gov"],
  usps: ["usps.com"],
  fedex: ["fedex.com"],
  ups: ["ups.com"],
  dhl: ["dhl.com"],
};

export function normalizeBrandName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getOfficialDomains(brandName: string): string[] {
  const key = normalizeBrandName(brandName);
  return BRAND_DOMAINS[key] ?? [];
}

export function stringSimilarity(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  if (left.includes(right) || right.includes(left)) return 0.8;

  const matrix: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  );

  for (let i = 0; i <= left.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= right.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[left.length]![right.length]!;
  return 1 - distance / Math.max(left.length, right.length);
}
