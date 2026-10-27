import { createStore } from '@tanstack/react-store';
import { validVariant, type Color, type Product } from './catalog';

export const CART_KEY = 'noslopfactory.cart.v1';
export const ORDER_KEY = 'noslopfactory.order.v1';
export const MAX_QUANTITY = 99;
export interface CartLine {
  productId: string;
  color: Color;
  size: string;
  quantity: number;
}
export interface OrderLine extends CartLine {
  title: string;
  priceCents: number;
  image: string;
}
export interface DemoOrder {
  reference: string;
  createdAt: string;
  lines: OrderLine[];
  totalCents: number;
}
export interface CartState {
  lines: CartLine[];
  order: DemoOrder | null;
  ready: boolean;
  storageBlocked: boolean;
}
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const lineKey = (line: Pick<CartLine, 'productId' | 'color' | 'size'>) =>
  JSON.stringify([line.productId, line.color, line.size]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function restoreLines(
  raw: string | null,
  products: Product[],
): CartLine[] {
  if (!raw) return [];
  try {
    const saved: unknown = JSON.parse(raw);
    if (!record(saved) || saved.version !== 1 || !Array.isArray(saved.lines))
      return [];
    const lines = new Map<string, CartLine>();
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    for (const candidate of saved.lines.slice(0, 500)) {
      if (!record(candidate)) continue;
      const product =
        typeof candidate.productId === 'string'
          ? productsById.get(candidate.productId)
          : undefined;
      if (!product || !validVariant(product, candidate.color, candidate.size))
        continue;
      if (
        typeof candidate.quantity !== 'number' ||
        !Number.isInteger(candidate.quantity) ||
        candidate.quantity < 1
      )
        continue;
      const line: CartLine = {
        productId: product.id,
        color: candidate.color as Color,
        size: candidate.size as string,
        quantity: Math.min(candidate.quantity, MAX_QUANTITY),
      };
      const previous = lines.get(lineKey(line));
      lines.set(lineKey(line), {
        ...line,
        quantity: Math.min(
          MAX_QUANTITY,
          (previous?.quantity ?? 0) + line.quantity,
        ),
      });
    }
    return [...lines.values()];
  } catch {
    return [];
  }
}

function restoreOrder(raw: string | null): DemoOrder | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      typeof value.reference !== 'string' ||
      !/^DEMO-[A-Z0-9-]{1,40}$/.test(value.reference)
    )
      return null;
    if (
      typeof value.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      !Array.isArray(value.lines) ||
      !value.lines.length ||
      value.lines.length > 500
    )
      return null;
    const lines: OrderLine[] = [];
    for (const line of value.lines) {
      if (
        !record(line) ||
        typeof line.productId !== 'string' ||
        typeof line.title !== 'string' ||
        typeof line.size !== 'string'
      )
        return null;
      if (
        !['black', 'off-white'].includes(String(line.color)) ||
        typeof line.image !== 'string' ||
        !/^\/products\/[a-z0-9-]+\.(png|webp|jpg)$/.test(line.image)
      )
        return null;
      if (
        typeof line.quantity !== 'number' ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > MAX_QUANTITY
      )
        return null;
      if (
        typeof line.priceCents !== 'number' ||
        !Number.isInteger(line.priceCents) ||
        line.priceCents <= 0 ||
        line.priceCents > 1000000
      )
        return null;
      lines.push({
        productId: line.productId,
        title: line.title,
        color: line.color as Color,
        size: line.size,
        image: line.image,
        quantity: line.quantity,
        priceCents: line.priceCents,
      });
    }
    const totalCents = lines.reduce(
      (sum, line) => sum + line.priceCents * line.quantity,
      0,
    );
    if (value.totalCents !== totalCents) return null;
    return {
      reference: value.reference,
      createdAt: value.createdAt,
      lines,
      totalCents,
    };
  } catch {
    return null;
  }
}

export function cartTotal(lines: CartLine[], products: Product[]) {
  const prices = new Map(
    products.map((product) => [product.id, product.priceCents]),
  );
  return lines.reduce(
    (sum, line) => sum + (prices.get(line.productId) ?? 0) * line.quantity,
    0,
  );
}

export function createCart(initialProducts: Product[] = []) {
  let products = initialProducts;
  let productsById = new Map(products.map((product) => [product.id, product]));
  let storage: StoragePort | undefined;
  let session: StoragePort | undefined;
  const store = createStore<CartState>({
    lines: [],
    order: null,
    ready: false,
    storageBlocked: false,
  });

  function blocked() {
    store.setState((state) => ({ ...state, storageBlocked: true }));
  }
  function read(port: StoragePort | undefined, key: string) {
    try {
      return port?.getItem(key) ?? null;
    } catch {
      blocked();
      return null;
    }
  }
  function write(port: StoragePort | undefined, key: string, value: unknown) {
    try {
      port?.setItem(key, JSON.stringify(value));
    } catch {
      blocked();
    }
  }
  function replace(lines: CartLine[], persist = true) {
    store.setState((state) => ({ ...state, lines }));
    if (persist) write(storage, CART_KEY, { version: 1, lines });
  }

  return {
    store,
    initialize(catalog: Product[], local?: StoragePort, tab?: StoragePort) {
      if (store.get().ready) return;
      products = catalog;
      productsById = new Map(products.map((product) => [product.id, product]));
      storage = local;
      session = tab;
      const lines = restoreLines(read(storage, CART_KEY), products);
      const order = restoreOrder(read(session, ORDER_KEY));
      store.setState((state) => ({ ...state, lines, order, ready: true }));
    },
    storageUnavailable: blocked,
    sync(raw: string | null) {
      replace(restoreLines(raw, products), false);
    },
    add(productId: string, color: Color, size: string, quantity = 1) {
      const product = productsById.get(productId);
      if (
        !store.get().ready ||
        !product ||
        !validVariant(product, color, size) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      )
        return false;
      const line = {
        productId,
        color,
        size,
        quantity: Math.min(quantity, MAX_QUANTITY),
      };
      const key = lineKey(line);
      const existing = store.get().lines.find((item) => lineKey(item) === key);
      const lines = existing
        ? store.get().lines.map((item) =>
            lineKey(item) === key
              ? {
                  ...item,
                  quantity: Math.min(MAX_QUANTITY, item.quantity + quantity),
                }
              : item,
          )
        : [...store.get().lines, line];
      replace(lines);
      return true;
    },
    quantity(key: string, quantity: number) {
      if (
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        quantity > MAX_QUANTITY
      )
        return;
      replace(
        store
          .get()
          .lines.flatMap((line) =>
            lineKey(line) !== key
              ? [line]
              : quantity === 0
                ? []
                : [{ ...line, quantity }],
          ),
      );
    },
    remove(key: string) {
      replace(store.get().lines.filter((line) => lineKey(line) !== key));
    },
    placeOrder(
      makeReference = () =>
        `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    ): DemoOrder | null {
      const selections = store.get().lines;
      if (!selections.length) return null;
      const lines: OrderLine[] = [];
      for (const line of selections) {
        const product = productsById.get(line.productId);
        const image = product?.images.find(
          (image) => image.color === line.color,
        );
        if (!product || !image || !validVariant(product, line.color, line.size))
          return null;
        lines.push({
          ...line,
          title: product.title,
          priceCents: product.priceCents,
          image: image.src,
        });
      }
      const order: DemoOrder = {
        reference: makeReference(),
        createdAt: new Date().toISOString(),
        lines,
        totalCents: lines.reduce(
          (sum, line) => sum + line.priceCents * line.quantity,
          0,
        ),
      };
      store.setState((state) => ({ ...state, order, lines: [] }));
      write(session, ORDER_KEY, order);
      write(storage, CART_KEY, { version: 1, lines: [] });
      return order;
    },
  };
}

// This module instance is shared by the header island and the shop application.
// Hydrate only after mounting so prerendered markup never contains browser state.
export const cart = createCart();
