import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  freeShippingProgress,
} from '../../lib/cart';
import { money } from '../../lib/catalog';

export function FreeShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  if (subtotalCents <= 0) return null;
  const { remainingCents, percent, unlocked } =
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
        aria-valuetext={
          unlocked
            ? 'Free shipping unlocked'
            : `${money(subtotalCents)} of ${money(FREE_SHIPPING_THRESHOLD_CENTS)} toward free shipping`
        }
      >
        <div className="free-shipping__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
