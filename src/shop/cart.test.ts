import { Effect, Option } from 'effect';
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CART_KEY, ORDER_KEY, encodeCart, lineKey } from '../lib/cart';
import { products } from '../test/catalog';
import * as Cart from './cart';

const line = {
  productId: 'tee',
  color: 'black',
  size: 'M',
  quantity: 1,
} as const;
const key = lineKey(line);

const cartWith = (overrides: Partial<Cart.Model> = {}): Cart.Model => ({
  ...Cart.init({
    products,
    maybeSavedCart: Option.none(),
    maybeSavedOrder: Option.none(),
    cartStorage: 'Available',
    orderStorage: 'Available',
  }),
  ...overrides,
});
const withLine = cartWith({ lines: [line] });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cart state', () => {
  it('restores the saved cart and receipt at startup', () => {
    const cart = Cart.init({
      products,
      maybeSavedCart: Option.some(encodeCart([{ ...line, quantity: 2 }])),
      maybeSavedOrder: Option.some('not json'),
      cartStorage: 'Available',
      orderStorage: 'Blocked',
    });
    expect(cart.lines).toEqual([{ ...line, quantity: 2 }]);
    expect(cart.maybeOrder).toEqual(Option.none());
    expect(Cart.isStorageBlocked(cart)).toBe(true);
  });

  it('adds a variant and saves the cart', () => {
    const addition = Cart.addSelection(cartWith(), {
      productId: 'tee',
      color: 'black',
      size: 'M',
    });
    expect(addition.model.lines).toEqual([line]);
    expect(addition.commands).toHaveLength(1);
    const rejected = Cart.addSelection(cartWith(), {
      productId: 'tee',
      color: 'black',
      size: 'XXXXL',
    });
    expect(rejected.model.lines).toEqual([]);
    expect(rejected.commands).toBeUndefined();
  });

  it('shows a storage warning after a failed write and clears it after the next success', () => {
    story(
      Cart.update,
      given(withLine),
      message(Cart.Message.ClickedIncreaseQuantity({ key })),
      Command.expectExact(Cart.SaveCart({ lines: [{ ...line, quantity: 2 }] })),
      Command.resolve(Cart.SaveCart, Cart.Message.FailedSaveCart()),
      model((cart) => {
        expect(Cart.isStorageBlocked(cart)).toBe(true);
        expect(cart.lines[0]?.quantity).toBe(2);
      }),
      message(Cart.Message.ClickedDecreaseQuantity({ key })),
      Command.resolve(Cart.SaveCart, Cart.Message.SucceededSaveCart()),
      model((cart) => {
        expect(Cart.isStorageBlocked(cart)).toBe(false);
        expect(cart.lines[0]?.quantity).toBe(1);
      }),
    );
  });

  it('accepts cart changes from another tab without saving them again', () => {
    story(
      Cart.update,
      given(cartWith()),
      message(
        Cart.Message.UpdatedCartInOtherTab({
          maybeSavedCart: Option.some(encodeCart([line])),
        }),
      ),
      Command.expectNone(),
      model((cart) => expect(cart.lines).toEqual([line])),
      message(
        Cart.Message.UpdatedCartInOtherTab({ maybeSavedCart: Option.none() }),
      ),
      model((cart) => expect(cart.lines).toEqual([])),
    );
  });

  it('opens and closes the mini cart through dialog Commands', () => {
    story(
      Cart.update,
      given(cartWith()),
      message(Cart.Message.ClickedOpenMiniCart()),
      model((cart) => expect(cart.miniCart).toBe('Open')),
      Command.resolve(Cart.ShowMiniCart, Cart.Message.CompletedShowMiniCart()),
      message(Cart.Message.CancelledMiniCart()),
      model((cart) => expect(cart.miniCart).toBe('Closed')),
      Command.resolve(
        Cart.CloseMiniCart,
        Cart.Message.CompletedCloseMiniCart(),
      ),
    );
    expect(Cart.closeMiniCart(cartWith()).commands).toBeUndefined();
  });
});

describe('quantity field', () => {
  it('applies whole numbers while typing and keeps the last valid quantity', () => {
    story(
      Cart.update,
      given(withLine),
      message(
        Cart.Message.UpdatedQuantityInput({ key, surface: 'Page', value: '' }),
      ),
      Command.expectNone(),
      message(
        Cart.Message.UpdatedQuantityInput({ key, surface: 'Page', value: '2' }),
      ),
      Command.resolve(Cart.SaveCart, Cart.Message.SucceededSaveCart()),
      message(
        Cart.Message.UpdatedQuantityInput({
          key,
          surface: 'Page',
          value: '150',
        }),
      ),
      model((cart) => {
        expect(cart.lines[0]?.quantity).toBe(2);
        expect(Cart.draftFor(cart, key, 'Page')).toEqual(
          Option.some({
            key,
            surface: 'Page',
            maybeText: Option.some('150'),
            isRejected: true,
          }),
        );
        expect(Cart.draftFor(cart, key, 'MiniCart')).toEqual(Option.none());
      }),
      message(Cart.Message.BlurredQuantityInput({ key, surface: 'Page' })),
      model((cart) =>
        expect(Cart.draftFor(cart, key, 'Page')).toEqual(
          Option.some({
            key,
            surface: 'Page',
            maybeText: Option.none(),
            isRejected: true,
          }),
        ),
      ),
      message(Cart.Message.ClickedIncreaseQuantity({ key })),
      Command.resolve(Cart.SaveCart, Cart.Message.SucceededSaveCart()),
      model((cart) => {
        expect(cart.lines[0]?.quantity).toBe(3);
        expect(cart.quantityDrafts).toEqual([]);
      }),
    );
  });

  it('removes the line at zero', () => {
    story(
      Cart.update,
      given(withLine),
      message(Cart.Message.ClickedDecreaseQuantity({ key })),
      Command.resolve(
        Cart.SaveCart({ lines: [] }),
        Cart.Message.SucceededSaveCart(),
      ),
      model((cart) => expect(cart.lines).toEqual([])),
    );
  });
});

describe('simulated checkout', () => {
  it('starts an order only for a non-empty cart', () => {
    expect(Cart.placeOrder(withLine).commands).toHaveLength(1);
    expect(Cart.placeOrder(cartWith()).commands).toBeUndefined();
  });

  it('stores a receipt, clears the cart once and reports the order', () => {
    story(
      Cart.update,
      given(cartWith({ lines: [{ ...line, quantity: 2 }] })),
      message(
        Cart.Message.CompletedGenerateOrderReference({
          reference: 'DEMO-TEST',
          createdAt: '2026-11-24T10:00:00.000Z',
        }),
      ),
      expectOutMessage(Cart.OutMessage.PlacedOrder()),
      model((cart) => {
        expect(cart.lines).toEqual([]);
        expect(
          Option.map(cart.maybeOrder, (order) => order.totalCents),
        ).toEqual(Option.some(6400));
      }),
      Command.expectExact(Cart.SaveOrder, Cart.SaveCart({ lines: [] })),
      Command.resolveAllExact(
        [Cart.SaveOrder, Cart.Message.SucceededSaveOrder()],
        [Cart.SaveCart, Cart.Message.SucceededSaveCart()],
      ),
      message(
        Cart.Message.CompletedGenerateOrderReference({
          reference: 'DEMO-DUPLICATE',
          createdAt: '2026-11-24T10:00:01.000Z',
        }),
      ),
      Command.expectNone(),
      model((cart) =>
        expect(Option.map(cart.maybeOrder, (order) => order.reference)).toEqual(
          Option.some('DEMO-TEST'),
        ),
      ),
    );
  });
});

describe('storage Commands', () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => void values.set(name, value),
    };
  };

  it('saves only identifiers, selections and quantities', () => {
    const localStorage = memory();
    vi.stubGlobal('window', { localStorage });
    const result = Effect.runSync(Cart.SaveCart({ lines: [line] }).effect);
    expect(result).toEqual(Cart.Message.SucceededSaveCart());
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual({
      version: 1,
      lines: [line],
    });
  });

  it('reports blocked storage instead of failing', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      },
    });
    vi.stubGlobal('document', { getElementById: () => null });
    expect(Effect.runSync(Cart.SaveCart({ lines: [] }).effect)).toEqual(
      Cart.Message.FailedSaveCart(),
    );
    const flags = Effect.runSync(Cart.flags);
    expect(flags.cartStorage).toBe('Blocked');
    expect(flags.orderStorage).toBe('Available');
    expect(flags.products).toEqual([]);
    expect(ORDER_KEY).toBe('noslopfactory.order.v1');
  });
});
