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
  const { remainingCents, percent, unlocked } =
    freeShippingProgress(subtotalCents);
  const message = unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return (
    <div className="free-shipping">
      <p className="free-shipping__message" id={messageId} aria-live="polite">
        {message}
      </p>
      <div
        className="free-shipping__track"
        role="progressbar"
        aria-labelledby={messageId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={message}
      >
        <div className="free-shipping__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
