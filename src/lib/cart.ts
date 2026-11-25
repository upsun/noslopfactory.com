import { Option, Schema } from 'effect';
import {
  Color,
  MAX_PRICE_CENTS,
  PHOTO_PATH,
  findProduct,
  productImage,
  validVariant,
  type Product,
} from './catalog';

export const CART_KEY = 'noslopfactory.cart.v1';
export const ORDER_KEY = 'noslopfactory.order.v1';
export const MAX_QUANTITY = 99;
export const SHIPPING_CENTS = 900;
const MAX_SAVED_LINES = 500;

const Quantity = Schema.Int.check(
  Schema.isBetween({ minimum: 1, maximum: MAX_QUANTITY }),
);

/** One cart line. A product, color and size combination identifies it. */
export const CartLine = Schema.Struct({
  productId: Schema.String,
  color: Color,
  size: Schema.String,
  quantity: Quantity,
});
export type CartLine = typeof CartLine.Type;
export const CartLines = Schema.Array(CartLine);

export const OrderLine = Schema.Struct({
  productId: Schema.String,
  title: Schema.String,
  color: Color,
  size: Schema.String,
  quantity: Quantity,
  priceCents: Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: MAX_PRICE_CENTS }),
  ),
  image: Schema.String.check(Schema.isPattern(PHOTO_PATH)),
});
export type OrderLine = typeof OrderLine.Type;

/** The immutable snapshot of a simulated order. */
export const DemoOrder = Schema.Struct({
  reference: Schema.String.check(Schema.isPattern(/^DEMO-[A-Z0-9-]{1,40}$/)),
  createdAt: Schema.String.check(
    Schema.makeFilter((value: string) => Number.isFinite(Date.parse(value))),
  ),
  lines: Schema.Array(OrderLine).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_SAVED_LINES),
  ),
  shippingCents: Schema.Literals([0, SHIPPING_CENTS]),
  totalCents: Schema.Int,
});
export type DemoOrder = typeof DemoOrder.Type;

const SavedCart = Schema.fromJsonString(
  Schema.Struct({
    version: Schema.Literal(1),
    lines: Schema.Array(Schema.Unknown),
  }),
);
const SavedLine = Schema.Struct({
  productId: Schema.String,
  color: Color,
  size: Schema.String,
  quantity: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
});
// Receipts saved before shipping existed have no shipping field.
const SavedOrder = Schema.fromJsonString(
  Schema.Struct({
    ...DemoOrder.fields,
    shippingCents: Schema.optionalKey(DemoOrder.fields.shippingCents),
  }),
);
const decodeSavedCart = Schema.decodeUnknownOption(SavedCart);
const decodeSavedLine = Schema.decodeUnknownOption(SavedLine);
const decodeSavedOrder = Schema.decodeUnknownOption(SavedOrder);

export type LineKey = string;
export const lineKey = (line: Pick<CartLine, 'productId' | 'color' | 'size'>) =>
  JSON.stringify([line.productId, line.color, line.size]);

const capped = (quantity: number) => Math.min(quantity, MAX_QUANTITY);

function mergeLine(
  lines: ReadonlyArray<CartLine>,
  line: CartLine,
): ReadonlyArray<CartLine> {
  const key = lineKey(line);
  return lines.some((item) => lineKey(item) === key)
    ? lines.map((item) =>
        lineKey(item) === key
          ? { ...item, quantity: capped(item.quantity + line.quantity) }
          : item,
      )
    : [...lines, line];
}

/** Restores saved selections. Unknown products, variants and malformed data are discarded. */
export function restoreLines(
  raw: string | null,
  products: ReadonlyArray<Product>,
): ReadonlyArray<CartLine> {
  return Option.match(decodeSavedCart(raw), {
    onNone: () => [],
    onSome: (saved) =>
      saved.lines
        .slice(0, MAX_SAVED_LINES)
        .reduce<ReadonlyArray<CartLine>>((lines, candidate) => {
          const restored = Option.filter(decodeSavedLine(candidate), (line) => {
            const product = findProduct(products, line.productId);
            return (
              product !== undefined &&
              validVariant(product, line.color, line.size)
            );
          });
          return Option.match(restored, {
            onNone: () => lines,
            onSome: (line) =>
              mergeLine(lines, { ...line, quantity: capped(line.quantity) }),
          });
        }, []),
  });
}

/** The saved cart contains only identifiers, selections and quantities. */
export const encodeCart = (lines: ReadonlyArray<CartLine>) =>
  JSON.stringify({
    version: 1,
    lines: lines.map(({ productId, color, size, quantity }) => ({
      productId,
      color,
      size,
      quantity,
    })),
  });

export const encodeOrder = (order: DemoOrder) => JSON.stringify(order);

const orderTotal = (lines: ReadonlyArray<OrderLine>, shippingCents: number) =>
  lines.reduce(
    (sum, line) => sum + line.priceCents * line.quantity,
    shippingCents,
  );

/** Restores the last demo receipt. Totals that do not match the lines are rejected. */
export function restoreOrder(raw: string | null): Option.Option<DemoOrder> {
  return decodeSavedOrder(raw).pipe(
    Option.map((saved) => ({
      ...saved,
      shippingCents: saved.shippingCents ?? 0,
    })),
    Option.filter(
      (order) =>
        order.totalCents === orderTotal(order.lines, order.shippingCents),
    ),
  );
}

export function addLine(
  lines: ReadonlyArray<CartLine>,
  products: ReadonlyArray<Product>,
  selection: Pick<CartLine, 'productId' | 'color' | 'size'>,
  quantity = 1,
): Option.Option<ReadonlyArray<CartLine>> {
  const product = findProduct(products, selection.productId);
  if (
    !product ||
    !validVariant(product, selection.color, selection.size) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  )
    return Option.none();
  return Option.some(
    mergeLine(lines, { ...selection, quantity: capped(quantity) }),
  );
}

export const isValidQuantity = (quantity: number) =>
  Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;

/** Sets one line's quantity. Zero removes the line. Other invalid values change nothing. */
export function setQuantity(
  lines: ReadonlyArray<CartLine>,
  key: LineKey,
  quantity: number,
): ReadonlyArray<CartLine> {
  if (quantity === 0) return removeLine(lines, key);
  if (!isValidQuantity(quantity)) return lines;
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity } : line,
  );
}

export const removeLine = (lines: ReadonlyArray<CartLine>, key: LineKey) =>
  lines.filter((line) => lineKey(line) !== key);

export const itemCount = (lines: ReadonlyArray<CartLine>) =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export function cartTotals(
  lines: ReadonlyArray<CartLine>,
  products: ReadonlyArray<Product>,
): Totals {
  const subtotalCents = lines.reduce(
    (sum, line) =>
      sum +
      (findProduct(products, line.productId)?.priceCents ?? 0) * line.quantity,
    0,
  );
  const shippingCents = lines.length ? SHIPPING_CENTS : 0;
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

export const orderTotals = (order: DemoOrder): Totals => ({
  subtotalCents: order.totalCents - order.shippingCents,
  shippingCents: order.shippingCents,
  totalCents: order.totalCents,
});

/** Builds the receipt snapshot. Returns none for an empty cart or a stale line. */
export function createOrder(
  lines: ReadonlyArray<CartLine>,
  products: ReadonlyArray<Product>,
  reference: string,
  createdAt: string,
): Option.Option<DemoOrder> {
  if (!lines.length) return Option.none();
  const orderLines: Array<OrderLine> = [];
  for (const line of lines) {
    const product = findProduct(products, line.productId);
    if (!product || !validVariant(product, line.color, line.size))
      return Option.none();
    orderLines.push({
      ...line,
      title: product.title,
      priceCents: product.priceCents,
      image: productImage(product, line.color).src,
    });
  }
  return Option.some({
    reference,
    createdAt,
    lines: orderLines,
    shippingCents: SHIPPING_CENTS,
    totalCents: cartTotals(lines, products).totalCents,
  });
}

/** Formats random bytes as a demo order reference. */
export const demoReference = (bytes: ReadonlyArray<number>) =>
  `DEMO-${bytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
