import { useState } from 'react';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { cart } from '../../lib/cart';
import {
  colorLabel,
  money,
  productImage,
  type Color,
  type Product as ProductData,
} from '../../lib/catalog';
import { useCatalog } from './CatalogContext';
import { useCart } from './useCart';
import { Arrow } from './Icons';

function ProductDetails({
  product,
  initialColor,
}: {
  product: ProductData;
  initialColor: Color;
}) {
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(
    product.sizes.length === 1 ? product.sizes[0]! : '',
  );
  const [added, setAdded] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const { ready } = useCart();
  const image =
    showBack && product.backImage
      ? product.backImage
      : productImage(product, color);
  return (
    <main className="wrap product-page" id="main">
      <Link to="/" className="text-button back-link">
        ← Back to the collection
      </Link>
      <div className="product-layout">
        <div className="product-gallery">
          <div className="product-detail-photo">
            <img
              src={image.src}
              alt={image.alt}
              width="1000"
              height="1000"
              fetchPriority="high"
            />
          </div>
          {product.backImage && (
            <div
              className="filter-tabs gallery-controls"
              role="group"
              aria-label="Product view"
            >
              <button
                type="button"
                aria-pressed={!showBack}
                onClick={() => setShowBack(false)}
              >
                Front
              </button>
              <button
                type="button"
                aria-pressed={showBack}
                onClick={() => setShowBack(true)}
              >
                Back print (off-white)
              </button>
            </div>
          )}
        </div>
        <div className="product-info">
          <span className="eyebrow">
            COLLECTION 001 / {product.category.toUpperCase()}
          </span>
          <h1 className={product.typography}>{product.slogan}</h1>
          <div className="product-price">
            {money(product.priceCents)}{' '}
            <span className="meta">USD · demo price</span>
          </div>
          <p className="product-description">{product.description}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (size && cart.add(product.id, color, size)) setAdded(true);
            }}
          >
            {product.colors.length > 1 && (
              <fieldset className="option-field">
                <legend>
                  Color <span className="muted">/ {colorLabel(color)}</span>
                </legend>
                <div className="color-options">
                  {product.colors.map((value) => (
                    <label
                      key={value}
                      className={`color-option ${color === value ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={value}
                        checked={color === value}
                        onChange={() => {
                          setColor(value);
                          setShowBack(false);
                          setAdded(false);
                        }}
                      />
                      <span className={`color-dot color-dot--${value}`} />
                      {colorLabel(value)}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="option-field">
              <legend>
                {product.category === 'stickers' ? 'Format' : 'Size'}
                {product.category === 'shirts' && (
                  <span className="muted"> / {size || 'Select a size'}</span>
                )}
              </legend>
              <div className="size-options">
                {product.sizes.map((value) => (
                  <label
                    key={value}
                    className={size === value ? 'is-selected' : ''}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={value}
                      required
                      checked={size === value}
                      onChange={() => {
                        setSize(value);
                        setAdded(false);
                      }}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className="button button--dark button--wide add-button"
              disabled={!ready || !size}
            >
              {!size ? 'Select a size' : added ? 'Add another' : 'Add to cart'}{' '}
              <span>{money(product.priceCents)}</span>
              <Arrow />
            </button>
            <div className="add-feedback" role="status">
              {added && (
                <span>
                  Added to your cart. <Link to="/cart">View cart →</Link>
                </span>
              )}
            </div>
          </form>
          <div className="product-facts">
            <h2 className="eyebrow">THE DETAILS</h2>
            <ul>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
          <p className="demo-disclosure">
            <span className="status-dot" />A demo object. Nothing will be
            charged or shipped.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Product() {
  const { productId } = useParams({ strict: false });
  const { color } = useSearch({ strict: false });
  const product = useCatalog().find((item) => item.id === productId);
  if (!product)
    return (
      <main className="wrap empty-page" id="main">
        <h1>Object not found.</h1>
        <Link className="button button--dark" to="/">
          Back to the collection <Arrow />
        </Link>
      </main>
    );
  const initialColor =
    color && product.colors.includes(color) ? color : product.colors[0]!;
  return (
    <ProductDetails
      key={`${product.id}-${initialColor}`}
      product={product}
      initialColor={initialColor}
    />
  );
}
