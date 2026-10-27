import { cart, lineKey, MAX_QUANTITY, type CartLine } from '../../lib/cart';
import {
  colorLabel,
  money,
  productImage,
  type Product,
} from '../../lib/catalog';
import { ShopLink } from './ShopLink';

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
              <div className="quantity-control">
                <button
                  type="button"
                  disabled={line.quantity <= 1}
                  aria-label={`Decrease ${quantityLabel.toLowerCase()}`}
                  onClick={() => cart.quantity(key, line.quantity - 1)}
                >
                  −
                </button>
                <input
                  aria-label={quantityLabel}
                  type="number"
                  min="1"
                  max={MAX_QUANTITY}
                  value={line.quantity}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (
                      Number.isInteger(value) &&
                      value >= 1 &&
                      value <= MAX_QUANTITY
                    )
                      cart.quantity(key, value);
                  }}
                />
                <button
                  type="button"
                  disabled={line.quantity >= MAX_QUANTITY}
                  aria-label={`Increase ${quantityLabel.toLowerCase()}`}
                  onClick={() => cart.quantity(key, line.quantity + 1)}
                >
                  +
                </button>
              </div>
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
