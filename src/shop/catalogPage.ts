import { Array, Option, Schema } from 'effect';
import { Submodel, type Update } from 'foldkit';
import type { Html, HtmlBuilder } from 'foldkit/html';
import { defineMessageUnion } from 'foldkit/message';
import { modifyFields } from 'foldkit/struct';
import {
  Color,
  categories,
  colorLabel,
  money,
  productImage,
  type Category,
  type Product,
} from '../lib/catalog';
import { productHref } from './route';
import { arrow, asterisk } from './view';

// MODEL

export const Filter = Schema.Literals(['all', ...categories]);
export type Filter = typeof Filter.Type;

export const Model = Schema.Struct({
  filter: Filter,
  previewColors: Schema.Array(
    Schema.Struct({ productId: Schema.String, color: Color }),
  ),
});
export type Model = typeof Model.Type;

export const init = (): Model => ({ filter: 'all', previewColors: [] });

// MESSAGE

export const Message = defineMessageUnion({
  SelectedFilter: { filter: Filter },
  SelectedPreviewColor: { productId: Schema.String, color: Color },
});
export type Message = typeof Message.Type;

// UPDATE

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    SelectedFilter: ({ filter }) => ({
      model: modifyFields(model, { filter: () => filter }),
    }),
    SelectedPreviewColor: ({ productId, color }) => ({
      model: modifyFields(model, {
        previewColors: (previewColors) => [
          ...Array.filter(
            previewColors,
            (item) => item.productId !== productId,
          ),
          { productId, color },
        ],
      }),
    }),
  });

// VIEW

type H = HtmlBuilder<Message>;

const filterLabel: Record<Filter, string> = {
  all: 'All objects',
  shirts: 'Shirts',
  caps: 'Caps',
  stickers: 'Stickers',
};
const cardEyebrow: Record<Category, string> = {
  shirts: 'THE TEE',
  caps: 'THE CAP',
  stickers: 'THE STICKER',
};

const twoDigits = (value: number) => String(value).padStart(2, '0');

const previewColor = (model: Model, product: Product): Color =>
  Option.getOrElse(
    Option.filter(
      Option.map(
        Array.findFirst(
          model.previewColors,
          (item) => item.productId === product.id,
        ),
        (item) => item.color,
      ),
      (color) => product.colors.includes(color),
    ),
    () => product.colors[0]!,
  );

const productCardView = (
  model: Model,
  product: Product,
  index: number,
  total: number,
  position: number,
  h: H,
): Html => {
  const color = previewColor(model, product);
  const image = productImage(product, color);
  const href = productHref(product.id, color);
  return h.keyed('article')(
    product.id,
    [h.Class('product-card')],
    [
      h.a(
        [
          h.Class('product-card__photo'),
          h.Href(href),
          h.AriaLabel(`View ${product.title}`),
        ],
        [
          h.img([
            h.Src(image.src),
            h.Alt(image.alt),
            h.Width('1000'),
            h.Height('1000'),
            h.Loading(index < 3 ? 'eager' : 'lazy'),
            h.Fetchpriority(index === 0 ? 'high' : 'auto'),
          ]),
          h.span(
            [h.Class('product-card__number mono')],
            [`${twoDigits(position)} / ${twoDigits(total)}`],
          ),
          h.span([h.Class('product-card__view')], [arrow(h, true)]),
        ],
      ),
      h.div(
        [h.Class('product-card__details')],
        [
          h.div(
            [],
            [
              h.p([h.Class('eyebrow')], [cardEyebrow[product.category]]),
              h.a(
                [
                  h.Href(href),
                  h.Class(`product-card__slogan ${product.typography}`),
                ],
                [product.slogan],
              ),
            ],
          ),
          h.span([h.Class('product-card__price')], [money(product.priceCents)]),
        ],
      ),
      h.div(
        [h.Class('product-card__variants')],
        [
          product.colors.length > 1
            ? h.div(
                [
                  h.Class('swatches'),
                  h.AriaLabel(`Preview color for ${product.title}`),
                ],
                product.colors.map((value) =>
                  h.keyed('button')(
                    value,
                    [
                      h.Class(`swatch swatch--${value}`),
                      h.Type('button'),
                      h.AriaLabel(`${colorLabel(value)} ${product.title}`),
                      h.AriaPressed(String(color === value)),
                      h.OnClick(
                        Message.SelectedPreviewColor({
                          productId: product.id,
                          color: value,
                        }),
                      ),
                    ],
                    [h.span([], [])],
                  ),
                ),
              )
            : h.span(
                [h.Class('meta')],
                [
                  product.category === 'caps'
                    ? 'One size. Many thoughts.'
                    : 'One very honest sticker.',
                ],
              ),
          product.category === 'shirts'
            ? h.span(
                [h.Class('meta')],
                [`${product.sizes[0]} – ${product.sizes.at(-1)}`],
              )
            : h.empty,
        ],
      ),
    ],
  );
};

const desktopBreak = (h: H) => h.br([h.Class('desktop-break')]);

export const view = Submodel.defineView<
  Model,
  Message,
  Readonly<{ products: ReadonlyArray<Product> }>
>((model, { products }, h) => {
  const shown =
    model.filter === 'all'
      ? products
      : products.filter((product) => product.category === model.filter);
  const countFor = (filter: Filter) =>
    filter === 'all'
      ? products.length
      : products.filter((product) => product.category === filter).length;
  return h.main(
    [h.Id('main')],
    [
      h.section(
        [h.Class('shop-intro wrap')],
        [
          h.div(
            [h.Class('section-label')],
            [
              h.span([h.Class('eyebrow')], ['NOSLOPFACTORY / THE SHOP']),
              h.span(
                [h.Class('eyebrow collection-label')],
                ['COLLECTION 001 · HUMAN APPROVED*'],
              ),
            ],
          ),
          h.div(
            [h.Class('shop-intro__grid')],
            [
              h.h1(
                [],
                [
                  'For the human',
                  h.br([]),
                  'in the ',
                  h.em([], ['loop.']),
                  h.span([h.Class('hero-asterisk')], [asterisk(h)]),
                ],
              ),
              h.div(
                [h.Class('shop-intro__aside')],
                [
                  h.p(
                    [],
                    [
                      'A small collection of things',
                      desktopBreak(h),
                      ' the machine would say.',
                    ],
                  ),
                  h.p(
                    [h.Class('muted')],
                    [
                      'Shirts, caps, and stickers for people',
                      desktopBreak(h),
                      ' who still read the output.',
                    ],
                  ),
                  h.a(
                    [h.Class('text-button intro-link'), h.Href('#collection')],
                    [
                      'Meet the collection ',
                      h.span([h.AriaHidden(true)], ['↓']),
                    ],
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('intro-footnote')],
            [
              h.span([h.Class('status-dot')], []),
              h.span(
                [],
                ['This is a demo shop. Real skepticism. Imaginary orders.'],
              ),
              h.span(
                [h.Class('intro-footnote__right')],
                ['*Subject to further review.'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [
          h.Class('collection wrap'),
          h.Id('collection'),
          h.AriaLabel('Product collection'),
        ],
        [
          h.div(
            [h.Class('collection-toolbar')],
            [
              h.div(
                [
                  h.Class('filter-tabs'),
                  h.Role('group'),
                  h.AriaLabel('Filter products by category'),
                ],
                Filter.literals.map((filter) =>
                  h.keyed('button')(
                    filter,
                    [
                      h.Type('button'),
                      h.AriaPressed(String(model.filter === filter)),
                      h.Class(model.filter === filter ? 'is-active' : ''),
                      h.OnClick(Message.SelectedFilter({ filter })),
                    ],
                    [
                      filterLabel[filter],
                      h.span([], [String(countFor(filter))]),
                    ],
                  ),
                ),
              ),
              h.span(
                [h.Class('eyebrow product-count'), h.AriaLive('polite')],
                [`${twoDigits(shown.length)} OBJECTS`],
              ),
            ],
          ),
          h.div(
            [h.Class('product-grid')],
            shown.map((product, index) =>
              productCardView(
                model,
                product,
                index,
                products.length,
                products.indexOf(product) + 1,
                h,
              ),
            ),
          ),
        ],
      ),
      h.section(
        [h.Class('shop-note wrap')],
        [
          h.span([h.Class('eyebrow')], ['A NOTE FROM THE FACTORY']),
          h.p(
            [],
            [
              'Made of cotton, paper,',
              h.br([]),
              'and ',
              h.em([], ['healthy doubt.']),
            ],
          ),
          h.div(
            [],
            [
              h.p([], ['No checkout anxiety. No actual checkout, either.']),
              h.p(
                [h.Class('muted')],
                [
                  'Everything here is a demo. Add something to your cart,',
                  desktopBreak(h),
                  ' try the flow, and keep your credit card to yourself.',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
