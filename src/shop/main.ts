import { Effect, Option, Schema } from 'effect';
import { Command, Dom, Render, Runtime, Subscription, Update } from 'foldkit';
import type { Document, Html, HtmlBuilder } from 'foldkit/html';
import { defineMessageUnion } from 'foldkit/message';
import { UrlRequest, load, pushUrl } from 'foldkit/navigation';
import { modifyFields } from 'foldkit/struct';
import { Url, toString as urlToString } from 'foldkit/url';
import { cartTotals, orderTotals } from '../lib/cart';
import { colorLabel, findProduct, money, productImage } from '../lib/catalog';
import * as Cart from './cart';
import { cartItemsView, headerView } from './cartView';
import * as CatalogPage from './catalogPage';
import * as ProductPage from './productPage';
import {
  AppRoute,
  cartRouter,
  catalogRouter,
  checkoutRouter,
  confirmationRouter,
  isShopPath,
  normalizePath,
  urlToAppRoute,
} from './route';
import {
  arrow,
  emptyStateView,
  orderTotalsView,
  storageNoticeView,
} from './view';

const SITE_NAME = 'noslopfactory';
const MAIN_ID = 'main';

// MODEL

export const Model = Schema.Struct({
  route: AppRoute,
  location: Schema.String,
  cart: Cart.Model,
  catalogPage: CatalogPage.Model,
  maybeProductPage: Schema.Option(ProductPage.Model),
});
export type Model = typeof Model.Type;

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedJumpToFragment: {},
  CompletedFocusMain: {},
  ClickedPlaceOrder: {},
  GotCartMessage: { message: Cart.Message },
  GotCatalogMessage: { message: CatalogPage.Message },
  GotProductMessage: { message: ProductPage.Message },
});
export type Message = typeof Message.Type;

// FLAGS

export const Flags = Cart.Flags;
export const flags = Cart.flags;

// INIT

/** The path and query identify a page. A fragment change stays on the page. */
const locationOf = (url: Url) =>
  normalizePath(url.pathname) +
  Option.match(url.search, {
    onNone: () => '',
    onSome: (search) => `?${search}`,
  });

const productPageFor = (model: Pick<Model, 'route' | 'cart'>) =>
  AppRoute.matchOrElse(
    model.route,
    {
      Product: ({ productId, color }) =>
        Option.map(
          Option.fromNullishOr(findProduct(model.cart.products, productId)),
          (product) => ProductPage.init(product, color),
        ),
    },
    () => Option.none(),
  );

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  Cart.Flags
> = (flags, url) => {
  const route = urlToAppRoute(url);
  const cart = Cart.init(flags);
  return {
    model: {
      route,
      location: locationOf(url),
      cart,
      catalogPage: CatalogPage.init(),
      maybeProductPage: productPageFor({ route, cart }),
    },
  };
};

// COMMAND

// A new page opens at its fragment target if there is one, otherwise at the top.
const scrollAfterNavigation = (url: string) => {
  const fragment = decodeURIComponent(
    new URL(url, window.location.href).hash.slice(1),
  );
  const target = fragment ? document.getElementById(fragment) : null;
  if (target) {
    target.scrollIntoView();
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
};

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(
      Effect.andThen(Render.afterCommit),
      Effect.andThen(Effect.sync(() => scrollAfterNavigation(url))),
      Effect.as(Message.CompletedNavigateInternal()),
    ),
});

export const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
});

// The browser scrolls to the target and moves the focus start point, as for a native fragment link.
export const JumpToFragment = Command.define('JumpToFragment', {
  args: { fragment: Schema.String },
  messages: [Message.CompletedJumpToFragment],
  execute: ({ fragment }) =>
    Effect.sync(() => {
      if (window.location.hash === `#${fragment}`) {
        document.getElementById(fragment)?.scrollIntoView();
      } else {
        window.location.hash = fragment;
      }
    }).pipe(Effect.as(Message.CompletedJumpToFragment())),
});

export const FocusMain = Command.define('FocusMain', {
  messages: [Message.CompletedFocusMain],
  execute: Dom.focus(`#${MAIN_ID}`, {
    preventScroll: true,
    makeFocusable: true,
  }).pipe(Effect.ignore, Effect.as(Message.CompletedFocusMain())),
});

// UPDATE

type UpdateReturn = Update.Return<Model, Message>;

const readCart = (model: Model) => Option.some(model.cart);
const writeCart = (model: Model, nextCart: Cart.Model) =>
  modifyFields(model, { cart: () => nextCart });
const toCartMessage = (message: Cart.Message) =>
  Message.GotCartMessage({ message });

const foldCart = Update.foldChild({
  update: Cart.update,
  read: readCart,
  write: writeCart,
  toParentMessage: toCartMessage,
  foldOutMessage: (outMessage) =>
    Cart.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
      PlacedOrder: () => (model) => ({
        model,
        commands: [NavigateInternal({ url: confirmationRouter() })],
      }),
    }),
});
const closeMiniCart = Update.foldChildStep({
  update: Cart.closeMiniCart,
  read: readCart,
  write: writeCart,
  toParentMessage: toCartMessage,
});
const addToCart = Update.foldChild({
  update: Cart.addSelection,
  read: readCart,
  write: writeCart,
  toParentMessage: toCartMessage,
});
const placeOrder = Update.foldChildStep({
  update: Cart.placeOrder,
  read: readCart,
  write: writeCart,
  toParentMessage: toCartMessage,
});

const foldCatalogPage = Update.foldChild({
  update: CatalogPage.update,
  read: (model: Model) => Option.some(model.catalogPage),
  write: (model, nextCatalogPage) =>
    modifyFields(model, { catalogPage: () => nextCatalogPage }),
  toParentMessage: (message) => Message.GotCatalogMessage({ message }),
});

const foldProductPage = Update.foldChild({
  update: ProductPage.update,
  read: (model: Model) => model.maybeProductPage,
  write: (model, nextProductPage) =>
    modifyFields(model, {
      maybeProductPage: () => Option.some(nextProductPage),
    }),
  toParentMessage: (message) => Message.GotProductMessage({ message }),
  foldOutMessage: (outMessage) =>
    ProductPage.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
      RequestedAddToCart: (selection) => addToCart(selection),
    }),
});

const requestUrl = (model: Model, url: Url): UpdateReturn => {
  const href = urlToString(url);
  if (!isShopPath(normalizePath(url.pathname))) {
    return { model, commands: [LoadExternal({ href })] };
  }
  return Option.match(url.hash, {
    onSome: (fragment) =>
      locationOf(url) === model.location
        ? { model, commands: [JumpToFragment({ fragment })] }
        : { model, commands: [NavigateInternal({ url: href })] },
    onNone: () => ({ model, commands: [NavigateInternal({ url: href })] }),
  });
};

const changeUrl = (model: Model, url: Url): UpdateReturn => {
  const location = locationOf(url);
  if (location === model.location) {
    return { model };
  }
  const route = urlToAppRoute(url);
  return {
    model: modifyFields(model, {
      route: () => route,
      location: () => location,
      catalogPage: () => CatalogPage.init(),
      maybeProductPage: () => productPageFor({ route, cart: model.cart }),
    }),
    commands: [FocusMain()],
  };
};

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      Update.combine(model, [
        closeMiniCart,
        (stepModel: Model) =>
          UrlRequest.match<UpdateReturn>(request, {
            Internal: ({ url }) => requestUrl(stepModel, url),
            External: ({ href }) => ({
              model: stepModel,
              commands: [LoadExternal({ href })],
            }),
          }),
      ]),
    ChangedUrl: ({ url }) =>
      Update.combine(model, [
        closeMiniCart,
        (stepModel: Model) => changeUrl(stepModel, url),
      ]),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedJumpToFragment: () => ({ model }),
    CompletedFocusMain: () => ({ model }),
    ClickedPlaceOrder: () => placeOrder(model),
    GotCartMessage: ({ message }) => foldCart(model, message),
    GotCatalogMessage: ({ message }) => foldCatalogPage(model, message),
    GotProductMessage: ({ message }) => foldProductPage(model, message),
  });

// SUBSCRIPTION

export const subscriptions = Subscription.lift(Cart.subscriptions)<
  Model,
  Message
>({
  read: readCart,
  toParentMessage: toCartMessage,
});

// VIEW

type H = HtmlBuilder<Message>;

const embedCartItems = (model: Model, h: H) =>
  h.submodel({
    slotId: 'cart-items-page',
    model: model.cart,
    view: cartItemsView,
    viewInputs: { surface: 'Page' as const },
    toParentMessage: toCartMessage,
  });

const loopEmphasis = (h: H, first: string, emphasis: string) => [
  first,
  h.br([]),
  ' ',
  h.em([], [emphasis]),
];

const cartView = (model: Model, h: H): Html => {
  const isBlocked = Cart.isStorageBlocked(model.cart);
  if (!model.cart.lines.length) {
    return h.main(
      [h.Class('wrap empty-page'), h.Id(MAIN_ID)],
      [
        h.span([h.Class('eyebrow')], ['YOUR CART']),
        h.h1([], ['No slop in here.', h.br([]), h.em([], ['Yet.'])]),
        h.p([], ['Your next questionable purchase is waiting.']),
        h.a(
          [h.Class('button button--dark'), h.Href(catalogRouter())],
          ['Explore the collection ', arrow(h)],
        ),
        storageNoticeView(h, isBlocked),
      ],
    );
  }
  return h.main(
    [h.Class('wrap flow-page'), h.Id(MAIN_ID)],
    [
      h.a(
        [h.Class('text-button back-link'), h.Href(catalogRouter())],
        ['← Back to the collection'],
      ),
      h.span([h.Class('eyebrow')], ['01 / THE SELECTION']),
      h.h1([], ['Your ', h.em([], ['cart.'])]),
      storageNoticeView(h, isBlocked),
      h.div(
        [h.Class('flow-layout')],
        [
          embedCartItems(model, h),
          h.aside(
            [h.Class('order-summary')],
            [
              h.h2([], ['The short version.']),
              ...orderTotalsView(
                h,
                cartTotals(model.cart.lines, model.cart.products),
              ),
              h.p([h.Class('meta')], ['USD. No tax charges.']),
              h.a(
                [
                  h.Class('button button--dark button--wide'),
                  h.Href(checkoutRouter()),
                ],
                ['Simulated checkout ', arrow(h)],
              ),
              h.p(
                [h.Class('demo-disclosure')],
                [
                  'This is a demo. No payment or personal information required.',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
};

const checkoutView = (model: Model, h: H): Html => {
  const { lines, products } = model.cart;
  if (!lines.length) {
    return emptyStateView(h, {
      eyebrow: 'SIMULATED CHECKOUT',
      title: loopEmphasis(h, 'Nothing to', 'overthink.'),
      description: 'Add an object to your cart before placing a demo order.',
    });
  }
  return h.main(
    [h.Class('wrap flow-page'), h.Id(MAIN_ID)],
    [
      h.a(
        [h.Class('text-button back-link'), h.Href(cartRouter())],
        ['← Back to your cart'],
      ),
      h.span([h.Class('eyebrow')], ['02 / THE SIMULATION']),
      h.h1([], ['Almost ', h.em([], ['real.'])]),
      h.div(
        [h.Class('flow-layout')],
        [
          h.section(
            [h.Class('checkout-explanation')],
            [
              h.span([h.Class('simulation-symbol'), h.AriaHidden(true)], ['↳']),
              h.h2(
                [],
                ['All the checkout.', h.br([]), 'None of the commitment.'],
              ),
              h.p(
                [],
                [
                  'This is a simulated order. We won’t ask for your name, address, payment details, or a convincing reason to buy another shirt.',
                ],
              ),
              h.div(
                [h.Class('demo-panel')],
                [
                  h.span([h.Class('status-dot')], []),
                  h.div(
                    [],
                    [
                      h.strong([], ['Nothing will be charged or shipped.']),
                      h.p(
                        [],
                        [
                          'You’ll get a fake order confirmation. Your cart will then be cleared.',
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              storageNoticeView(h, Cart.isStorageBlocked(model.cart)),
            ],
          ),
          h.aside(
            [h.Class('order-summary')],
            [
              h.h2([], ['Your imaginary order.']),
              h.ul(
                [h.Class('summary-items')],
                lines.flatMap((line) => {
                  const product = findProduct(products, line.productId);
                  return product
                    ? [
                        h.li(
                          [],
                          [
                            h.img([
                              h.Src(productImage(product, line.color).src),
                              h.Alt(''),
                              h.Width('64'),
                              h.Height('64'),
                            ]),
                            h.div(
                              [],
                              [
                                h.strong([], [product.title]),
                                h.p(
                                  [h.Class('meta')],
                                  [
                                    `${colorLabel(line.color)} / ${line.size} · Qty ${line.quantity}`,
                                  ],
                                ),
                              ],
                            ),
                            h.span(
                              [],
                              [money(product.priceCents * line.quantity)],
                            ),
                          ],
                        ),
                      ]
                    : [];
                }),
              ),
              ...orderTotalsView(h, cartTotals(lines, products)),
              h.p([h.Class('meta')], ['USD. No tax charges.']),
              h.button(
                [
                  h.Class('button button--dark button--wide'),
                  h.Type('button'),
                  h.OnClick(Message.ClickedPlaceOrder()),
                ],
                ['Place demo order ', arrow(h)],
              ),
              h.p(
                [h.Class('demo-disclosure')],
                ['No payment. No personal information. No actual order.'],
              ),
            ],
          ),
        ],
      ),
    ],
  );
};

const confirmationView = (model: Model, h: H): Html =>
  Option.match(model.cart.maybeOrder, {
    onNone: () =>
      emptyStateView(h, {
        eyebrow: 'NO DEMO ORDER YET',
        title: loopEmphasis(h, 'Probably', 'hallucinated.'),
        description: 'There’s no order confirmation in this tab yet.',
      }),
    onSome: (order) =>
      h.main(
        [h.Class('wrap confirmation-page'), h.Id(MAIN_ID)],
        [
          h.div(
            [h.Class('confirmation-heading')],
            [
              h.span(
                [h.Class('confirmation-check'), h.AriaHidden(true)],
                ['✓'],
              ),
              h.span([h.Class('eyebrow')], ['03 / MISSION SIMULATED']),
              h.h1(
                [],
                [
                  'You’re absolutely',
                  h.br([]),
                  ' ',
                  h.em([], ['not being charged.']),
                ],
              ),
              h.p(
                [],
                [
                  'Your demo order is confirmed. Nothing will be shipped.',
                  h.br([]),
                  'The skepticism looks good on you, though.',
                ],
              ),
              h.span([h.Class('order-reference mono')], [order.reference]),
            ],
          ),
          h.section(
            [
              h.Class('confirmation-receipt'),
              h.AriaLabel('Demo order receipt'),
            ],
            [
              h.div(
                [h.Class('total-row')],
                [
                  h.h2([], ['Your imaginary haul.']),
                  h.span([h.Class('eyebrow')], ['DEMO CONFIRMATION']),
                ],
              ),
              h.ul(
                [h.Class('summary-items')],
                order.lines.map((line) =>
                  h.li(
                    [],
                    [
                      h.img([
                        h.Src(line.image),
                        h.Alt(''),
                        h.Width('80'),
                        h.Height('80'),
                      ]),
                      h.div(
                        [],
                        [
                          h.strong([], [line.title]),
                          h.p(
                            [h.Class('meta')],
                            [
                              `${colorLabel(line.color)} / ${line.size} · Qty ${line.quantity}`,
                            ],
                          ),
                        ],
                      ),
                      h.span([], [money(line.priceCents * line.quantity)]),
                    ],
                  ),
                ),
              ),
              ...orderTotalsView(h, orderTotals(order), 'Demo total (USD)'),
              h.div(
                [h.Class('total-row')],
                [h.span([], ['Actually charged']), h.strong([], ['$0'])],
              ),
            ],
          ),
          h.a(
            [h.Class('button button--dark'), h.Href(catalogRouter())],
            ['Back to the collection ', arrow(h)],
          ),
        ],
      ),
  });

const notFoundView = (h: H): Html =>
  h.main(
    [h.Class('wrap empty-page'), h.Id(MAIN_ID)],
    [
      h.h1([], ['Lost in the ', h.em([], ['context.'])]),
      h.a(
        [h.Class('button button--dark'), h.Href(catalogRouter())],
        ['Back to the collection →'],
      ),
    ],
  );

const productView = (model: Model, h: H): Html =>
  Option.match(model.maybeProductPage, {
    onNone: () => ProductPage.notFoundView(h),
    onSome: (productPage) =>
      Option.match(
        Option.fromNullishOr(
          findProduct(model.cart.products, productPage.productId),
        ),
        {
          onNone: () => ProductPage.notFoundView(h),
          onSome: (product) =>
            h.submodel({
              slotId: 'product-page',
              model: productPage,
              view: ProductPage.view,
              viewInputs: { product },
              toParentMessage: (message) =>
                Message.GotProductMessage({ message }),
            }),
        },
      ),
  });

const pageTitle = (model: Model) =>
  AppRoute.match(model.route, {
    Catalog: () => 'The shop',
    Product: ({ productId }) =>
      findProduct(model.cart.products, productId)?.title ?? 'The shop',
    Cart: () => 'Your cart',
    Checkout: () => 'Simulated checkout',
    Confirmation: () => 'Demo order confirmed',
    NotFound: () => 'The shop',
  });

export const view = (model: Model, h: H): Document => ({
  title: `${pageTitle(model)} · ${SITE_NAME}`,
  body: h.div(
    [h.Class('app-root')],
    [
      h.submodel({
        slotId: 'header',
        model: model.cart,
        view: headerView,
        viewInputs: { isShop: true },
        toParentMessage: toCartMessage,
      }),
      AppRoute.match(model.route, {
        Catalog: () =>
          h.submodel({
            slotId: 'catalog-page',
            model: model.catalogPage,
            view: CatalogPage.view,
            viewInputs: { products: model.cart.products },
            toParentMessage: (message) =>
              Message.GotCatalogMessage({ message }),
          }),
        Product: () => productView(model, h),
        Cart: () => cartView(model, h),
        Checkout: () => checkoutView(model, h),
        Confirmation: () => confirmationView(model, h),
        NotFound: () => notFoundView(h),
      }),
    ],
  ),
});
