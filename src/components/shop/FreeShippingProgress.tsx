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
    <div
      className={`free-shipping${unlocked ? ' free-shipping--unlocked' : ''}`}
    >
      <p className="free-shipping__message" aria-live="polite">
        {message}
      </p>
      <div
        className="free-shipping__track"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={message}
      >
        <div
          className="free-shipping__fill"
          aria-hidden="true"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
