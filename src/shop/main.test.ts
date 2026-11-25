// Blur handlers check DOM types, so these view tests need DOM globals.
// @vitest-environment jsdom
import { Option } from 'effect';
import { Scene, Story } from 'foldkit';
import { fromString, type Url } from 'foldkit/url';
import { describe, expect, it } from 'vitest';
import { encodeCart, encodeOrder, createOrder } from '../lib/cart';
import { products } from '../test/catalog';
import * as Cart from './cart';
import {
  FocusMain,
  JumpToFragment,
  LoadExternal,
  Message,
  NavigateInternal,
  init,
  update,
  view,
  type Model,
} from './main';

const line = {
  productId: 'tee',
  color: 'black',
  size: 'M',
  quantity: 1,
} as const;
const receipt = Option.getOrThrow(
  createOrder([line], products, 'DEMO-TEST', '2026-11-24T10:00:00.000Z'),
);

const url = (path: string): Url =>
  Option.getOrThrowWith(
    fromString(`https://noslopfactory.com${path}`),
    () => new Error(path),
  );

const shopAt = (
  path: string,
  state: Readonly<{
    lines?: ReadonlyArray<typeof line>;
    isStorageBlocked?: boolean;
    hasReceipt?: boolean;
  }> = {},
): Model =>
  init(
    {
      products,
      maybeSavedCart: Option.some(encodeCart(state.lines ?? [])),
      maybeSavedOrder: state.hasReceipt
        ? Option.some(encodeOrder(receipt))
        : Option.none(),
      cartStorage: state.isStorageBlocked ? 'Blocked' : 'Available',
      orderStorage: 'Available',
    },
    url(path),
  ).model;

const {
  expect: expectView,
  role,
  text,
  label,
  inside,
  click,
  change,
  type,
  blur,
} = Scene;

describe('routing', () => {
  it('parses shop paths, trailing slashes, product colors and unknown paths', () => {
    expect(shopAt('/shop').route._tag).toBe('Catalog');
    expect(shopAt('/shop/cart/').route._tag).toBe('Cart');
    expect(shopAt('/shop/nope').route._tag).toBe('NotFound');
    const product = shopAt('/shop/products/tee?color=off-white');
    expect(Option.map(product.maybeProductPage, (page) => page.color)).toEqual(
      Option.some('off-white'),
    );
    const unknownColor = shopAt('/shop/products/tee?color=red');
    expect(
      Option.map(unknownColor.maybeProductPage, (page) => page.color),
    ).toEqual(Option.some('black'));
    expect(Option.isNone(shopAt('/shop/products/gone').maybeProductPage)).toBe(
      true,
    );
  });

  it('navigates inside the shop and loads pages outside it', () => {
    Story.story(
      update,
      Story.given(shopAt('/shop/cart')),
      Story.message(
        Message.ClickedLink({
          request: { _tag: 'Internal', url: url('/shop/checkout') },
        }),
      ),
      Story.Command.expectExact(
        NavigateInternal({ url: 'https://noslopfactory.com/shop/checkout' }),
      ),
      Story.Command.resolve(
        NavigateInternal,
        Message.CompletedNavigateInternal(),
      ),
      Story.message(
        Message.ClickedLink({ request: { _tag: 'Internal', url: url('/') } }),
      ),
      Story.Command.expectExact(LoadExternal),
      Story.Command.resolve(LoadExternal, Message.CompletedLoadExternal()),
    );
  });

  it('jumps to a fragment on the same page without a navigation', () => {
    Story.story(
      update,
      Story.given(shopAt('/shop')),
      Story.message(
        Message.ClickedLink({
          request: { _tag: 'Internal', url: url('/shop#collection') },
        }),
      ),
      Story.Command.expectExact(JumpToFragment({ fragment: 'collection' })),
      Story.Command.resolve(JumpToFragment, Message.CompletedJumpToFragment()),
      Story.message(Message.ChangedUrl({ url: url('/shop#collection') })),
      Story.Command.expectNone(),
    );
  });

  it('closes the mini cart, changes the page and focuses the main content', () => {
    Story.story(
      update,
      Story.given(shopAt('/shop/products/tee', { lines: [line] })),
      Story.message(
        Message.GotCartMessage({ message: Cart.Message.ClickedOpenMiniCart() }),
      ),
      Story.Command.resolve(
        Cart.ShowMiniCart,
        Cart.Message.CompletedShowMiniCart(),
      ),
      Story.message(Message.ChangedUrl({ url: url('/shop/cart') })),
      Story.model((model) => {
        expect(model.route._tag).toBe('Cart');
        expect(model.cart.miniCart).toBe('Closed');
        expect(Option.isNone(model.maybeProductPage)).toBe(true);
      }),
      Story.Command.expectExact(Cart.CloseMiniCart, FocusMain),
      Story.Command.resolveAllExact(
        [Cart.CloseMiniCart, Cart.Message.CompletedCloseMiniCart()],
        [FocusMain, Message.CompletedFocusMain()],
      ),
    );
  });

  it('opens the confirmation after the order is stored', () => {
    Story.story(
      update,
      Story.given(shopAt('/shop/checkout', { lines: [line] })),
      Story.message(Message.ClickedPlaceOrder()),
      Story.Command.resolve(
        Cart.GenerateOrderReference,
        Cart.Message.CompletedGenerateOrderReference({
          reference: 'DEMO-TEST',
          createdAt: '2026-11-24T10:00:00.000Z',
        }),
      ),
      Story.Command.expectExact(
        Cart.SaveOrder,
        Cart.SaveCart({ lines: [] }),
        NavigateInternal({ url: '/shop/confirmation' }),
      ),
      Story.Command.resolveAllExact(
        [Cart.SaveOrder, Cart.Message.SucceededSaveOrder()],
        [Cart.SaveCart, Cart.Message.SucceededSaveCart()],
        [NavigateInternal, Message.CompletedNavigateInternal()],
      ),
      Story.model((model) => {
        expect(model.cart.lines).toEqual([]);
        expect(Option.isSome(model.cart.maybeOrder)).toBe(true);
      }),
    );
  });
});

describe('views', () => {
  it('adds a selected size from the product page and shows it in the mini cart', () => {
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/products/tee')),
      expectView(
        role('heading', { name: 'You’re absolutely right.' }),
      ).toExist(),
      expectView(role('button', { name: 'Select a size $32' })).toBeDisabled(),
      change(Scene.selector('input[name="size"][value="M"]'), 'M'),
      click(role('button', { name: 'Add to cart $32' })),
      Scene.Command.resolve(Cart.SaveCart, Cart.Message.SucceededSaveCart()),
      expectView(text('Added to your cart.', { exact: false })).toExist(),
      expectView(role('button', { name: 'Add another $32' })).toExist(),
      click(role('button', { name: 'Open cart, 1 item' })),
      Scene.Command.resolve(
        Cart.ShowMiniCart,
        Cart.Message.CompletedShowMiniCart(),
      ),
      inside(
        role('dialog'),
        expectView(text('Shipping')).toExist(),
        expectView(text('$9')).toExist(),
        expectView(text('$41')).toExist(),
        expectView(role('link', { name: /^View cart/ })).toHaveAttr(
          'href',
          '/shop/cart',
        ),
      ),
    );
  });

  it('keeps a memory-only cart editable when storage is blocked', () => {
    const quantity = label('Quantity for The agreement tee, Black / M');
    Scene.scene(
      { update, view },
      Scene.given(
        shopAt('/shop/cart', { lines: [line], isStorageBlocked: true }),
      ),
      expectView(role('heading', { name: 'Your cart.' })).toExist(),
      expectView(text(/Your browser is blocking storage/)).toExist(),
      inside(
        role('main'),
        type(quantity, ''),
        expectView(quantity).toHaveValue(''),
        blur(quantity),
        expectView(quantity).toHaveValue('1'),
        type(quantity, '2'),
        Scene.Command.resolve(Cart.SaveCart, Cart.Message.FailedSaveCart()),
        blur(quantity),
        inside(
          role('complementary'),
          expectView(text('$64')).toExist(),
          expectView(text('$73')).toExist(),
        ),
        type(quantity, '150'),
        expectView(text(/Use a whole number from 1 to 99/)).toExist(),
        expectView(quantity).toHaveAttr('aria-invalid', 'true'),
        blur(quantity),
        expectView(quantity).toHaveValue('2'),
        expectView(quantity).toHaveAttr('aria-invalid', 'false'),
        expectView(text(/Quantity restored to 2/)).toExist(),
      ),
    );
  });

  it('summarizes the simulated checkout', () => {
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/checkout', { lines: [line] })),
      expectView(role('heading', { name: 'Almost real.' })).toExist(),
      inside(
        role('complementary'),
        expectView(text('Shipping')).toExist(),
        expectView(text('$41')).toExist(),
        expectView(role('button', { name: /^Place demo order/ })).toExist(),
      ),
    );
  });

  it('shows the stored receipt with shipping and nothing charged', () => {
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/confirmation', { hasReceipt: true })),
      expectView(
        role('heading', { name: 'You’re absolutely not being charged.' }),
      ).toExist(),
      expectView(role('button', { name: 'Open cart, 0 items' })).toExist(),
      expectView(text('DEMO-TEST')).toExist(),
      inside(
        role('region', { name: 'Demo order receipt' }),
        expectView(text('$9')).toExist(),
        expectView(text('$41')).toExist(),
        expectView(text('$0')).toExist(),
      ),
    );
  });

  it('offers a way back when there is nothing to show', () => {
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/confirmation')),
      expectView(role('heading', { name: 'Probably hallucinated.' })).toExist(),
    );
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/checkout')),
      expectView(role('heading', { name: 'Nothing to overthink.' })).toExist(),
    );
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop/products/gone')),
      expectView(role('heading', { name: 'Object not found.' })).toExist(),
    );
  });

  it('filters the catalog and previews another color', () => {
    Scene.scene(
      { update, view },
      Scene.given(shopAt('/shop')),
      expectView(text('02 OBJECTS')).toExist(),
      click(role('button', { name: /^Stickers/ })),
      expectView(text('01 OBJECTS')).toExist(),
      click(role('button', { name: /^All objects/ })),
      click(role('button', { name: 'Off-white The agreement tee' })),
      expectView(role('link', { name: 'View The agreement tee' })).toHaveAttr(
        'href',
        '/shop/products/tee?color=off-white',
      ),
    );
  });
});
