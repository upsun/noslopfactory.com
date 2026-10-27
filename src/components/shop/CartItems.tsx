import { useId, useState } from 'react';
import { cart, lineKey, MAX_QUANTITY, type CartLine } from '../../lib/cart';
import {
  colorLabel,
  money,
  productImage,
  type Product,
} from '../../lib/catalog';
import { ShopLink } from './ShopLink';

function QuantityControl({ line, label }: { line: CartLine; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const errorId = useId();
  const key = lineKey(line);
  return (
    <>
      <div className="quantity-control">
        <button
          type="button"
          disabled={line.quantity <= 1}
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => {
            setDraft(null);
            setHasError(false);
            cart.quantity(key, line.quantity - 1);
          }}
        >
          −
        </button>
        <input
          aria-label={label}
          type="number"
          min="1"
          max={MAX_QUANTITY}
          value={draft ?? line.quantity}
          aria-invalid={draft !== null && hasError}
          aria-describedby={hasError ? errorId : undefined}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            const quantity = event.currentTarget.valueAsNumber;
            const valid =
              Number.isInteger(quantity) &&
              quantity >= 1 &&
              quantity <= MAX_QUANTITY;
            setHasError(event.currentTarget.value !== '' && !valid);
            if (valid) cart.quantity(key, quantity);
          }}
          onBlur={() => setDraft(null)}
        />
        <button
          type="button"
          disabled={line.quantity >= MAX_QUANTITY}
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => {
            setDraft(null);
            setHasError(false);
            cart.quantity(key, line.quantity + 1);
          }}
        >
          +
        </button>
      </div>
      {hasError && (
        <p className="quantity-error" id={errorId} role="status">
          Use a whole number from 1 to 99. Last valid quantity: {line.quantity}.
        </p>
      )}
    </>
  );
}

export function CartItems({
  lines,
  products,
  compact = false,
  onNavigate,
}: {
  lines: CartLine[];
  products: Product[];
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className={`cart-items ${compact ? 'cart-items--compact' : ''}`}>
      {lines.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) return null;
        const key = lineKey(line);
        const variant = `${colorLabel(line.color)} / ${line.size}`;
        const quantityLabel = `Quantity for ${product.title}, ${variant}`;
        return (
          <li key={key} className="cart-item">
            <ShopLink
              className="cart-item__image"
              href={`/shop/products/${product.id}`}
              tabIndex={-1}
              aria-hidden="true"
              onClick={onNavigate}
            >
              <img
                src={productImage(product, line.color).src}
                alt=""
                width="160"
                height="160"
                loading="lazy"
              />
            </ShopLink>
            <div className="cart-item__info">
              <ShopLink
                className="cart-item__title"
                href={`/shop/products/${product.id}`}
                onClick={onNavigate}
              >
                {product.title}
              </ShopLink>
              <p className="meta">{variant}</p>
              <QuantityControl line={line} label={quantityLabel} />
            </div>
            <div className="cart-item__end">
              <span>{money(product.priceCents * line.quantity)}</span>
              <button
                type="button"
                className="text-button"
                aria-label={`Remove ${product.title}, ${variant}`}
                onClick={() => cart.remove(key)}
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
