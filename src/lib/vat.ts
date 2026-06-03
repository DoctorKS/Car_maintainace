/**
 * Thai VAT (ภาษีมูลค่าเพิ่ม).
 *
 * The user types item totals as the pre-tax amount (matching what's printed
 * on most service-centre receipts before the tax line). Every "ยอดรวม"
 * we display in a card adds 7% on top.
 */

export const VAT_RATE = 0.07;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Pre-VAT sum × 7%. */
export const vatOf = (subtotal: number): number => round2(subtotal * VAT_RATE);

/** Pre-VAT sum × 1.07. */
export const withVat = (subtotal: number): number => round2(subtotal * (1 + VAT_RATE));

/** Bundle for callers that want all three numbers at once. */
export interface VatBreakdown {
  subtotal: number;
  vat: number;
  grandTotal: number;
}

export function breakdown(subtotal: number): VatBreakdown {
  return {
    subtotal: round2(subtotal),
    vat: vatOf(subtotal),
    grandTotal: withVat(subtotal),
  };
}
