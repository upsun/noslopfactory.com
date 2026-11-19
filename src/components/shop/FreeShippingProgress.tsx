import { useId } from 'react';
import { freeShippingProgress } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  const messageId = useId();
  if (subtotalCents <= 0) return null;
  const { unlocked, remainingCents, percent } =
    freeShippingProgress(subtotalCents);
  const message = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div
      className={`shipping-progress${unlocked ? ' shipping-progress--unlocked' : ''}`}
    >
      <p
        className="shipping-progress__message"
        id={messageId}
        aria-live="polite"
      >
        {message}
      </p>
      <div
        className="shipping-progress__track"
        role="progressbar"
        aria-labelledby={messageId}
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
