import { freeShippingProgress } from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
  itemCount,
}: {
  subtotalCents: number;
  itemCount: number;
}) {
  const progress = freeShippingProgress(subtotalCents, itemCount);
  if (!progress.visible) return null;
  const message = progress.unlocked
    ? 'Free shipping unlocked'
    : `Add ${money(progress.remainingCents)} to get free shipping`;
  return (
    <div className="free-shipping">
      <div
        className="free-shipping__track"
        role="progressbar"
        aria-label="Free shipping progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={message}
      >
        <div
          className="free-shipping__fill"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="meta free-shipping__message" role="status">
        {message}
      </p>
    </div>
  );
}
