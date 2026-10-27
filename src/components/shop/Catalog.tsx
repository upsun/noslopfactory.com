import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  categories,
  colorLabel,
  money,
  productImage,
  type Category,
  type Color,
  type Product,
} from '../../lib/catalog';
import { useCatalog } from './CatalogContext';
import { Arrow, Asterisk } from './Icons';

function ProductCard({
  product,
  index,
  total,
  position,
}: {
  product: Product;
  index: number;
  total: number;
  position: number;
}) {
  const [previewColor, setColor] = useState<Color | null>(null);
  const color =
    previewColor && product.colors.includes(previewColor)
      ? previewColor
      : product.colors[0]!;
  const image = productImage(product, color);
  return (
    <article className="product-card">
      <Link
        className="product-card__photo"
        to="/products/$productId"
        params={{ productId: product.id }}
        search={{ color }}
        aria-label={`View ${product.title}`}
      >
        <img
          src={image.src}
          alt={image.alt}
          width="1000"
          height="1000"
          loading={index < 3 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />
        <span className="product-card__number mono">
          {String(position).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <span className="product-card__view">
          <Arrow diagonal />
        </span>
      </Link>
      <div className="product-card__details">
        <div>
          <p className="eyebrow">
            {product.category === 'shirts'
              ? 'THE TEE'
              : product.category === 'caps'
                ? 'THE CAP'
                : 'THE STICKER'}
          </p>
          <Link
            to="/products/$productId"
            params={{ productId: product.id }}
            search={{ color }}
            className={`product-card__slogan ${product.typography}`}
          >
            {product.slogan}
          </Link>
        </div>
        <span className="product-card__price">{money(product.priceCents)}</span>
      </div>
      <div className="product-card__variants">
        {product.colors.length > 1 ? (
          <div
            className="swatches"
            aria-label={`Preview color for ${product.title}`}
          >
            {product.colors.map((value) => (
              <button
                className={`swatch swatch--${value}`}
                key={value}
                type="button"
                aria-label={`${colorLabel(value)} ${product.title}`}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
              >
                <span />
              </button>
            ))}
          </div>
        ) : (
          <span className="meta">
            {product.category === 'caps'
              ? 'One size. Many thoughts.'
              : 'One very honest sticker.'}
          </span>
        )}
        {product.category === 'shirts' && (
          <span className="meta">
            {product.sizes[0]} – {product.sizes.at(-1)}
          </span>
        )}
      </div>
    </article>
  );
}

export default function Catalog() {
  const products = useCatalog();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const positions = new Map(
    products.map((product, index) => [product.id, index + 1]),
  );
  const shown =
    category === 'all'
      ? products
      : products.filter((product) => product.category === category);
  return (
    <main id="main">
      <section className="shop-intro wrap">
        <div className="section-label">
          <span className="eyebrow">NOSLOPFACTORY / THE SHOP</span>
          <span className="eyebrow collection-label">
            COLLECTION 001 · HUMAN APPROVED*
          </span>
        </div>
        <div className="shop-intro__grid">
          <h1>
            For the human
            <br />
            in the <em>loop.</em>
            <span className="hero-asterisk">
              <Asterisk />
            </span>
          </h1>
          <div className="shop-intro__aside">
            <p>
              A small collection of things
              <br className="desktop-break" /> the machine would say.
            </p>
            <p className="muted">
              Shirts, caps, and stickers for people
              <br className="desktop-break" /> who still read the output.
            </p>
            <a className="text-button intro-link" href="#collection">
              Meet the collection <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="intro-footnote">
          <span className="status-dot" />
          <span>This is a demo shop. Real skepticism. Imaginary orders.</span>
          <span className="intro-footnote__right">
            *Subject to further review.
          </span>
        </div>
      </section>
      <section
        className="collection wrap"
        id="collection"
        aria-label="Product collection"
      >
        <div className="collection-toolbar">
          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter products by category"
          >
            {(['all', ...categories] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                className={category === value ? 'is-active' : ''}
                onClick={() => setCategory(value)}
              >
                {value === 'all'
                  ? 'All objects'
                  : value === 'shirts'
                    ? 'Shirts'
                    : value === 'caps'
                      ? 'Caps'
                      : 'Stickers'}
                <span>
                  {value === 'all'
                    ? products.length
                    : products.filter((item) => item.category === value).length}
                </span>
              </button>
            ))}
          </div>
          <span className="eyebrow product-count" aria-live="polite">
            {String(shown.length).padStart(2, '0')} OBJECTS
          </span>
        </div>
        <div className="product-grid">
          {shown.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              total={products.length}
              position={positions.get(product.id) ?? index + 1}
            />
          ))}
        </div>
      </section>
      <section className="shop-note wrap">
        <span className="eyebrow">A NOTE FROM THE FACTORY</span>
        <p>
          Made of cotton, paper,
          <br />
          and <em>healthy doubt.</em>
        </p>
        <div>
          <p>No checkout anxiety. No actual checkout, either.</p>
          <p className="muted">
            Everything here is a demo. Add something to your cart,
            <br className="desktop-break" /> try the flow, and keep your credit
            card to yourself.
          </p>
        </div>
      </section>
    </main>
  );
}
