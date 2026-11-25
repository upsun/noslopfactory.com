import { Array, Option } from 'effect';
import { Submodel } from 'foldkit';
import type { Html, HtmlBuilder } from 'foldkit/html';
import {
  MAX_QUANTITY,
  cartTotals,
  itemCount,
  lineKey,
  type CartLine,
} from '../lib/cart';
import { colorLabel, findProduct, money, productImage } from '../lib/catalog';
import {
  MINI_CART_ID,
  Message,
  draftFor,
  type Model,
  type Surface,
} from './cart';
import { cartRouter, catalogRouter, productRouter } from './route';
import { arrow, bag, hidden, orderTotalsView } from './view';

type H = HtmlBuilder<Message>;

const fieldId = (surface: Surface, line: CartLine) =>
  `quantity-error-${surface}-${line.productId}-${line.color}-${line.size}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

const quantityControlView = (
  model: Model,
  line: CartLine,
  label: string,
  surface: Surface,
  h: H,
): ReadonlyArray<Html> => {
  const key = lineKey(line);
  const maybeDraft = draftFor(model, key, surface);
  const maybeText = Option.flatMap(maybeDraft, (draft) => draft.maybeText);
  const isRejected = Option.exists(maybeDraft, (draft) => draft.isRejected);
  const isInvalid = Option.isSome(maybeText) && isRejected;
  const errorId = fieldId(surface, line);
  return [
    h.div(
      [h.Class('quantity-control')],
      [
        h.button(
          [
            h.Type('button'),
            h.Disabled(line.quantity <= 1),
            h.AriaLabel(`Decrease ${label.toLowerCase()}`),
            h.OnClick(Message.ClickedDecreaseQuantity({ key })),
          ],
          ['−'],
        ),
        h.input([
          h.AriaLabel(label),
          h.Type('number'),
          h.Min('1'),
          h.Max(String(MAX_QUANTITY)),
          h.Value(Option.getOrElse(maybeText, () => String(line.quantity))),
          h.AriaInvalid(isInvalid),
          ...(isInvalid ? [h.AriaDescribedBy(errorId)] : []),
          h.OnInput((value) =>
            Message.UpdatedQuantityInput({ key, surface, value }),
          ),
          h.OnBlur(Message.BlurredQuantityInput({ key, surface })),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Disabled(line.quantity >= MAX_QUANTITY),
            h.AriaLabel(`Increase ${label.toLowerCase()}`),
            h.OnClick(Message.ClickedIncreaseQuantity({ key })),
          ],
          ['+'],
        ),
      ],
    ),
    isRejected
      ? h.p(
          [h.Class('quantity-error'), h.Id(errorId), h.Role('status')],
          [
            Option.isNone(maybeText)
              ? `Quantity restored to ${line.quantity}. `
              : '',
            'Use a whole number from 1 to 99.',
            Option.isSome(maybeText)
              ? ` Last valid quantity: ${line.quantity}.`
              : '',
          ],
        )
      : h.empty,
  ];
};

export const cartItemsView = Submodel.defineView<
  Model,
  Message,
  Readonly<{ surface: Surface }>
>((model, { surface }, h) =>
  h.ul(
    [
      h.Class(
        surface === 'MiniCart'
          ? 'cart-items cart-items--compact'
          : 'cart-items',
      ),
    ],
    Array.getSomes(
      Array.map(model.lines, (line) =>
        Option.map(
          Option.fromNullishOr(findProduct(model.products, line.productId)),
          (product) => {
            const variant = `${colorLabel(line.color)} / ${line.size}`;
            const productLink = productRouter({
              productId: product.id,
              color: Option.none(),
            });
            return h.keyed('li')(
              lineKey(line),
              [h.Class('cart-item')],
              [
                h.a(
                  [
                    h.Class('cart-item__image'),
                    h.Href(productLink),
                    h.Tabindex(-1),
                    h.AriaHidden(true),
                  ],
                  [
                    h.img([
                      h.Src(productImage(product, line.color).src),
                      h.Alt(''),
                      h.Width('160'),
                      h.Height('160'),
                      h.Loading('lazy'),
                    ]),
                  ],
                ),
                h.div(
                  [h.Class('cart-item__info')],
                  [
                    h.a(
                      [h.Class('cart-item__title'), h.Href(productLink)],
                      [product.title],
                    ),
                    h.p([h.Class('meta')], [variant]),
                    ...quantityControlView(
                      model,
                      line,
                      `Quantity for ${product.title}, ${variant}`,
                      surface,
                      h,
                    ),
                  ],
                ),
                h.div(
                  [h.Class('cart-item__end')],
                  [
                    h.span([], [money(product.priceCents * line.quantity)]),
                    h.button(
                      [
                        h.Type('button'),
                        h.Class('text-button'),
                        h.AriaLabel(`Remove ${product.title}, ${variant}`),
                        h.OnClick(
                          Message.ClickedRemoveLine({ key: lineKey(line) }),
                        ),
                      ],
                      ['Remove'],
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    ),
  ),
);

const miniCartView = (model: Model, h: H): Html =>
  h.dialog(
    [
      h.Id(MINI_CART_ID),
      h.Class('mini-cart'),
      h.AriaLabelledBy('mini-cart-title'),
      h.OnCancel(Message.CancelledMiniCart()),
    ],
    [
      h.div(
        [h.Class('mini-cart__head')],
        [
          h.div(
            [],
            [
              h.span([h.Class('eyebrow')], ['YOUR SELECTION']),
              h.h2(
                [h.Id('mini-cart-title')],
                ['The cart', h.span([h.Class('serif-italic')], ['.'])],
              ),
            ],
          ),
          h.button(
            [
              h.Class('icon-button'),
              h.Type('button'),
              h.AriaLabel('Close cart'),
              h.OnClick(Message.ClickedCloseMiniCart()),
            ],
            ['×'],
          ),
        ],
      ),
      ...Array.match(model.lines, {
        onEmpty: () => [
          h.div(
            [h.Class('empty-mini')],
            [
              bag(h),
              h.h3([], ['No slop in here. Yet.']),
              h.p([], ['Your cart is empty.']),
              h.a(
                [h.Class('button button--dark'), h.Href(catalogRouter())],
                ['Explore the collection ', arrow(h)],
              ),
            ],
          ),
        ],
        onNonEmpty: (lines) => [
          cartItemsView(model, { surface: 'MiniCart' }, h),
          h.div(
            [h.Class('mini-cart__bottom')],
            [
              ...orderTotalsView(h, cartTotals(lines, model.products)),
              h.p([h.Class('meta')], ['Demo products. No real charges.']),
              h.a(
                [
                  h.Class('button button--dark button--wide'),
                  h.Href(cartRouter()),
                ],
                ['View cart ', arrow(h)],
              ),
              h.a(
                [h.Class('text-button continue-link'), h.Href(catalogRouter())],
                ['Keep looking'],
              ),
            ],
          ),
        ],
      }),
    ],
  );

/** The site header, its cart button and the mini cart dialog. */
export const headerView = Submodel.defineView<
  Model,
  Message,
  Readonly<{ isShop: boolean }>
>((model, { isShop }, h) => {
  const count = itemCount(model.lines);
  return h.div(
    [h.Class('app-root')],
    [
      h.header(
        [h.Class('site-header')],
        [
          h.a(
            [h.Class('brand'), h.Href('/'), h.AriaLabel('noslopfactory home')],
            [
              h.span(
                [h.Class('brand__mark'), h.AriaHidden(true)],
                ['n', h.span([], ['/'])],
              ),
              h.span(
                [],
                ['noslopfactory', h.span([h.Class('brand__dot')], ['.'])],
              ),
            ],
          ),
          h.nav(
            [h.Class('capsule-nav'), h.AriaLabel('Main navigation')],
            [
              h.a(
                [h.Href('/'), ...(isShop ? [] : [h.AriaCurrent('page')])],
                ['The project'],
              ),
              h.a(
                [
                  h.Href(catalogRouter()),
                  ...(isShop ? [h.AriaCurrent('page')] : []),
                ],
                ['The shop ', hidden(h, '↗')],
              ),
            ],
          ),
          h.button(
            [
              h.Class('cart-trigger'),
              h.Type('button'),
              h.AriaHasPopup('dialog'),
              h.AriaLabel(
                `Open cart, ${count} ${count === 1 ? 'item' : 'items'}`,
              ),
              h.OnClick(Message.ClickedOpenMiniCart()),
            ],
            [
              bag(h),
              h.span([], ['Cart']),
              h.span([h.Class('cart-count')], [String(count)]),
            ],
          ),
        ],
      ),
      model.miniCart === 'Open'
        ? h.div([h.Class('mini-cart-backdrop'), h.AriaHidden(true)], [])
        : h.empty,
      miniCartView(model, h),
    ],
  );
});
