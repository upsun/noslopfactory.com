import { useId, type CSSProperties } from 'react';
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
  const messageId = useId();
  const { remainingCents, unlocked, percent } =
    freeShippingProgress(subtotalCents);
  return (
    <div className="shipping-progress">
      <p
        className="shipping-progress__message"
        id={messageId}
        aria-live="polite"
      >
        {unlocked
          ? 'Free shipping unlocked'
          : `Add ${money(remainingCents)} to get free shipping`}
      </p>
      <div
        className="shipping-progress__track"
        role="progressbar"
        aria-labelledby={messageId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${money(Math.min(subtotalCents, FREE_SHIPPING_THRESHOLD_CENTS))} of ${money(FREE_SHIPPING_THRESHOLD_CENTS)} toward free shipping`}
      >
        <div
          className="shipping-progress__bar"
          style={{ '--progress': `${percent}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
