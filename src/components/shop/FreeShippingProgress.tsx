import { useId } from 'react';
import type { cartTotals } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  totals,
  className = '',
}: {
  totals: ReturnType<typeof cartTotals>;
  className?: string;
}) {
  const messageId = useId();
  if (totals.subtotalCents <= 0) return null;
  // Reach 100 only once free shipping is unlocked, never by rounding just below the threshold.
  const percent = totals.freeShippingUnlocked
    ? 100
    : Math.min(99, Math.round(Math.max(0, totals.progress) * 100));
  const message = totals.freeShippingUnlocked
    ? 'Free shipping unlocked'
    : `Add ${money(totals.remainingCents)} to get free shipping`;
  return (
    <div
      className={`free-shipping${totals.freeShippingUnlocked ? ' free-shipping--unlocked' : ''}${className ? ` ${className}` : ''}`}
    >
      <p className="free-shipping__message" id={messageId} role="status">
        {message}
      </p>
      <div
        className="free-shipping__track"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-describedby={messageId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="free-shipping__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
