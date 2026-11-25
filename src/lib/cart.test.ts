import { Option } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  addLine,
  cartTotals,
  createOrder,
  demoReference,
  encodeCart,
  encodeOrder,
  lineKey,
  removeLine,
  restoreLines,
  restoreOrder,
  setQuantity,
  type CartLine,
} from './cart';
import { money } from './catalog';
import { products, shirt } from '../test/catalog';

const line: CartLine = {
  productId: 'tee',
  color: 'black',
  size: 'M',
  quantity: 1,
};
const saved = (lines: unknown[], version = 1) =>
  JSON.stringify({ version, lines });
const add = (
  lines: ReadonlyArray<CartLine>,
  productId: string,
  color: string,
  size: string,
  quantity = 1,
) =>
  Option.getOrElse(
    addLine(
      lines,
      products,
      { productId, color: color as never, size },
      quantity,
    ),
    () => lines,
  );
const order = (lines: ReadonlyArray<CartLine>, reference = 'DEMO-TEST') =>
  Option.getOrThrow(
    createOrder(lines, products, reference, '2026-11-24T10:00:00.000Z'),
  );

describe('variant-aware cart', () => {
  it('charges shipping once per non-empty cart and removes it with the last product', () => {
    expect(cartTotals([], products)).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
    let lines = add([], 'sticker', 'off-white', 'One format');
    expect(cartTotals(lines, products)).toEqual({
      subtotalCents: 400,
      shippingCents: 900,
      totalCents: 1300,
    });
    lines = setQuantity(lines, lineKey(lines[0]!), 3);
    lines = add(lines, 'tee', 'black', 'M');
    lines = add(lines, 'tee', 'off-white', 'M');
    expect(cartTotals(lines, products)).toEqual({
      subtotalCents: 7600,
      shippingCents: 900,
      totalCents: 8500,
    });
    lines = lines.reduce(
      (rest, item) => removeLine(rest, lineKey(item)),
      lines,
    );
    expect(cartTotals(lines, products)).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
  });

  it('formats editable prices without rounding away cents', () => {
    expect(money(3200)).toBe('$32');
    expect(money(3250)).toBe('$32.50');
    expect(
      cartTotals([{ ...line, quantity: 3 }], [{ ...shirt, priceCents: 3250 }])
        .subtotalCents,
    ).toBe(9750);
  });

  it('combines matching variants while retaining each color and size separately', () => {
    let lines = add([], 'tee', 'black', 'M');
    lines = add(lines, 'tee', 'black', 'M', 2);
    lines = add(lines, 'tee', 'off-white', 'M');
    lines = add(lines, 'tee', 'black', 'XS');
    expect(lines.map((item) => [item.color, item.size, item.quantity])).toEqual(
      [
        ['black', 'M', 3],
        ['off-white', 'M', 1],
        ['black', 'XS', 1],
      ],
    );
    expect(cartTotals(lines, products).subtotalCents).toBe(16000);
  });

  it('rejects unavailable products, variants and invalid quantities', () => {
    const attempt = (
      productId: string,
      color: string,
      size: string,
      quantity = 1,
    ) =>
      addLine(
        [],
        products,
        { productId, color: color as never, size },
        quantity,
      );
    expect(Option.isNone(attempt('missing', 'black', 'M'))).toBe(true);
    expect(Option.isNone(attempt('tee', 'black', 'XXXXL'))).toBe(true);
    expect(Option.isNone(attempt('sticker', 'black', 'One format'))).toBe(true);
    for (const value of [0, -1, 1.5, NaN, Infinity])
      expect(Option.isNone(attempt('tee', 'black', 'M', value))).toBe(true);
  });

  it('edits and removes only the selected variant, with integer cent totals', () => {
    let lines = add([], 'tee', 'black', 'M');
    lines = add(lines, 'tee', 'off-white', 'M');
    lines = add(lines, 'sticker', 'off-white', 'One format', 3);
    lines = setQuantity(lines, lineKey(line), 4);
    expect(cartTotals(lines, products).subtotalCents).toBe(17200);
    lines = removeLine(lines, lineKey(line));
    expect(lines).toHaveLength(2);
    expect(cartTotals(lines, products).subtotalCents).toBe(4400);
  });

  it('caps quantity at 99 and rejects invalid quantity edits', () => {
    let lines = add([], 'tee', 'black', 'M', 100);
    lines = add(lines, 'tee', 'black', 'M', 2);
    for (const value of [100, -2, 1.2, Infinity, NaN])
      lines = setQuantity(lines, lineKey(line), value);
    expect(lines[0]?.quantity).toBe(99);
    expect(setQuantity(lines, lineKey(line), 0)).toEqual([]);
  });
});

describe('browser persistence format', () => {
  it('restores selections but derives prices from the current catalog', () => {
    const lines = restoreLines(
      saved([{ ...line, priceCents: 1, quantity: 2 }]),
      products,
    );
    expect(cartTotals(lines, products).subtotalCents).toBe(6400);
    expect(encodeCart(lines)).not.toContain('priceCents');
    expect(restoreLines(encodeCart(lines), products)).toEqual(lines);
  });

  it.each([
    null,
    'not json',
    '{}',
    '[]',
    saved([line], 2),
    JSON.stringify({ version: 1, lines: {} }),
  ])('recovers from malformed or unsupported storage: %s', (raw) => {
    expect(restoreLines(raw, products)).toEqual([]);
  });

  it('discards stale entries and merges duplicate saved variants within the quantity limit', () => {
    const raw = saved([
      line,
      { ...line, quantity: 300 },
      { ...line, productId: 'removed' },
      { ...line, size: 'retired' },
      { ...line, quantity: '2' },
      { ...line, quantity: 1.5 },
      null,
    ]);
    expect(restoreLines(raw, products)).toEqual([{ ...line, quantity: 99 }]);
  });
});

describe('simulated checkout', () => {
  it('creates a stable receipt snapshot with shipping', () => {
    const lines = add(
      add([], 'tee', 'black', 'M', 2),
      'sticker',
      'off-white',
      'One format',
    );
    const receipt = order(lines);
    expect(receipt.totalCents).toBe(7700);
    expect(receipt.shippingCents).toBe(900);
    expect(receipt.lines[0]?.title).toBe(shirt.title);
    expect(receipt.lines[0]?.image).toBe('/products/right-black.webp');
    expect(restoreOrder(encodeOrder(receipt))).toEqual(Option.some(receipt));
  });

  it('creates no receipt for an empty cart or a stale line', () => {
    const createdAt = '2026-11-24T10:00:00.000Z';
    expect(Option.isNone(createOrder([], products, 'DEMO-A', createdAt))).toBe(
      true,
    );
    expect(
      Option.isNone(
        createOrder(
          [{ ...line, productId: 'gone' }],
          products,
          'DEMO-A',
          createdAt,
        ),
      ),
    ).toBe(true);
  });

  it('preserves pre-shipping receipts without adding a retroactive fee', () => {
    const { shippingCents, ...legacy } = order([line], 'DEMO-LEGACY');
    const legacyReceipt = {
      ...legacy,
      totalCents: legacy.totalCents - shippingCents,
    };
    expect(restoreOrder(JSON.stringify(legacyReceipt))).toEqual(
      Option.some({ ...legacyReceipt, shippingCents: 0 }),
    );
  });

  it('formats random bytes as a demo reference', () => {
    expect(demoReference([0, 15, 171, 255])).toBe('DEMO-000FABFF');
  });

  it('does not collect or persist personal information or payment fields', () => {
    const receipt = order([line], 'DEMO-PRIVATE');
    expect(Object.keys(receipt).sort()).toEqual([
      'createdAt',
      'lines',
      'reference',
      'shippingCents',
      'totalCents',
    ]);
    expect(encodeOrder(receipt)).not.toMatch(
      /email|address|payment|cardNumber/,
    );
  });

  it('rejects corrupted or externally supplied confirmation data', () => {
    const receipt = order([line], 'DEMO-VALID');
    for (const tampered of [
      { ...receipt, totalCents: 1 },
      { ...receipt, shippingCents: -900 },
      { ...receipt, shippingCents: '900' },
      {
        ...receipt,
        shippingCents: null,
        totalCents: receipt.totalCents - receipt.shippingCents,
      },
      { ...receipt, reference: 'REAL-ORDER' },
      { ...receipt, createdAt: 'yesterday' },
      { ...receipt, lines: [] },
      {
        ...receipt,
        lines: [
          { ...receipt.lines[0], image: 'https://tracker.example/pixel' },
        ],
      },
      { ...receipt, lines: [{ ...receipt.lines[0], quantity: -1 }] },
    ]) {
      expect(restoreOrder(JSON.stringify(tampered))).toEqual(Option.none());
    }
  });
});
