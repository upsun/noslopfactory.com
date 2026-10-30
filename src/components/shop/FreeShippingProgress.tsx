import { useId } from 'react';
import { freeShippingProgress } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  const id = useId();
  if (subtotalCents <= 0) return null;
  const { unlocked, remainingCents, percent } =
    freeShippingProgress(subtotalCents);
  const message = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div className="free-shipping">
      <p className="free-shipping__message" id={id} aria-live="polite">
        {message}
      </p>
      <div
        className="free-shipping__track"
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(percent)}
        aria-valuetext={message}
      >
        <span className="free-shipping__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
