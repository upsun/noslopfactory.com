import type { cartTotals } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function OrderTotals({
  totals,
  totalLabel = 'Total',
}: {
  totals: ReturnType<typeof cartTotals>;
  totalLabel?: string;
}) {
  return (
    <>
      <div className="total-row">
        <span>Subtotal</span>
        <span>{money(totals.subtotalCents)}</span>
      </div>
      <div className="total-row">
        <span>Shipping</span>
        <span>{money(totals.shippingCents)}</span>
      </div>
      <div className="total-row order-summary__total">
        <strong>{totalLabel}</strong>
        <strong>{money(totals.totalCents)}</strong>
      </div>
    </>
  );
}
