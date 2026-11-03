import { useId } from 'react';
import { freeShippingProgress } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  const labelId = useId();
  if (subtotalCents <= 0) return null;
  const { remainingCents, percent, unlocked } =
    freeShippingProgress(subtotalCents);
  const label = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div
      className={`shipping-progress${unlocked ? ' shipping-progress--unlocked' : ''}`}
    >
      <p className="shipping-progress__label" id={labelId} aria-live="polite">
        {label}
      </p>
      <div
        className="shipping-progress__track"
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
      >
        <span
          className="shipping-progress__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
