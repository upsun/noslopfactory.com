import { freeShippingProgress } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  if (subtotalCents <= 0) return null;
  const { unlocked, remainingCents, percent } =
    freeShippingProgress(subtotalCents);
  const message = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div className="shipping-progress">
      <p className="shipping-progress__message" aria-live="polite">
        {message}
      </p>
      <div
        className="shipping-progress__track"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={message}
      >
        <div
          className="shipping-progress__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
