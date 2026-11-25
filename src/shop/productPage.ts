import { Option, Schema } from 'effect';
import { Submodel, type Update } from 'foldkit';
import type { HtmlBuilder } from 'foldkit/html';
import { defineMessageUnion } from 'foldkit/message';
import { modifyFields } from 'foldkit/struct';
import {
  Color,
  colorLabel,
  money,
  productImage,
  type Product,
} from '../lib/catalog';
import { cartRouter, catalogRouter } from './route';
import { arrow } from './view';

// MODEL

export const Model = Schema.Struct({
  productId: Schema.String,
  color: Color,
  maybeSize: Schema.Option(Schema.String),
  isAdded: Schema.Boolean,
  isShowingBack: Schema.Boolean,
});
export type Model = typeof Model.Type;

/** Starts with the requested color when the product offers it. */
export const init = (
  product: Product,
  maybeColor: Option.Option<string>,
): Model => ({
  productId: product.id,
  color: Option.getOrElse(
    Option.filter(maybeColor, (color): color is Color =>
      product.colors.some((value) => value === color),
    ),
    () => product.colors[0]!,
  ),
  maybeSize:
    product.sizes.length === 1 ? Option.some(product.sizes[0]!) : Option.none(),
  isAdded: false,
  isShowingBack: false,
});

// MESSAGE

export const Message = defineMessageUnion({
  SelectedColor: { color: Color },
  SelectedSize: { size: Schema.String },
  SelectedFrontView: {},
  SelectedBackView: {},
  SubmittedAddToCart: {},
});
export type Message = typeof Message.Type;

export const OutMessage = defineMessageUnion({
  RequestedAddToCart: {
    productId: Schema.String,
    color: Color,
    size: Schema.String,
  },
});
export type OutMessage = typeof OutMessage.Type;

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    SelectedColor: ({ color }) => ({
      model: modifyFields(model, {
        color: () => color,
        isShowingBack: () => false,
        isAdded: () => false,
      }),
    }),
    SelectedSize: ({ size }) => ({
      model: modifyFields(model, {
        maybeSize: () => Option.some(size),
        isAdded: () => false,
      }),
    }),
    SelectedFrontView: () => ({
      model: modifyFields(model, { isShowingBack: () => false }),
    }),
    SelectedBackView: () => ({
      model: modifyFields(model, { isShowingBack: () => true }),
    }),
    SubmittedAddToCart: () =>
      Option.match(model.maybeSize, {
        onNone: () => ({ model }),
        onSome: (size) => ({
          model: modifyFields(model, { isAdded: () => true }),
          outMessage: OutMessage.RequestedAddToCart({
            productId: model.productId,
            color: model.color,
            size,
          }),
        }),
      }),
  });

// VIEW

type H = HtmlBuilder<Message>;

const radioOption = (
  h: H,
  name: string,
  value: string,
  isChecked: boolean,
  message: Message,
  isRequired: boolean,
) =>
  h.input([
    h.Type('radio'),
    h.Name(name),
    h.Value(value),
    h.Checked(isChecked),
    h.Required(isRequired),
    h.OnChange(() => message),
  ]);

export const view = Submodel.defineView<
  Model,
  Message,
  Readonly<{ product: Product }>
>((model, { product }, h) => {
  const image =
    model.isShowingBack && product.backImage
      ? product.backImage
      : productImage(product, model.color);
  const size = Option.getOrElse(model.maybeSize, () => '');
  return h.main(
    [h.Class('wrap product-page'), h.Id('main')],
    [
      h.a(
        [h.Class('text-button back-link'), h.Href(catalogRouter())],
        ['← Back to the collection'],
      ),
      h.div(
        [h.Class('product-layout')],
        [
          h.div(
            [h.Class('product-gallery')],
            [
              h.div(
                [h.Class('product-detail-photo')],
                [
                  h.img([
                    h.Src(image.src),
                    h.Alt(image.alt),
                    h.Width('1000'),
                    h.Height('1000'),
                    h.Fetchpriority('high'),
                  ]),
                ],
              ),
              product.backImage
                ? h.div(
                    [
                      h.Class('filter-tabs gallery-controls'),
                      h.Role('group'),
                      h.AriaLabel('Product view'),
                    ],
                    [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaPressed(String(!model.isShowingBack)),
                          h.OnClick(Message.SelectedFrontView()),
                        ],
                        ['Front'],
                      ),
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaPressed(String(model.isShowingBack)),
                          h.OnClick(Message.SelectedBackView()),
                        ],
                        ['Back print (off-white)'],
                      ),
                    ],
                  )
                : h.empty,
            ],
          ),
          h.div(
            [h.Class('product-info')],
            [
              h.span(
                [h.Class('eyebrow')],
                [`COLLECTION 001 / ${product.category.toUpperCase()}`],
              ),
              h.h1([h.Class(product.typography)], [product.slogan]),
              h.div(
                [h.Class('product-price')],
                [
                  `${money(product.priceCents)} `,
                  h.span([h.Class('meta')], ['USD · demo price']),
                ],
              ),
              h.p([h.Class('product-description')], [product.description]),
              h.form(
                [h.OnSubmit(Message.SubmittedAddToCart())],
                [
                  product.colors.length > 1
                    ? h.fieldset(
                        [h.Class('option-field')],
                        [
                          h.legend(
                            [],
                            [
                              'Color ',
                              h.span(
                                [h.Class('muted')],
                                [`/ ${colorLabel(model.color)}`],
                              ),
                            ],
                          ),
                          h.div(
                            [h.Class('color-options')],
                            product.colors.map((value) =>
                              h.keyed('label')(
                                value,
                                [
                                  h.Class(
                                    model.color === value
                                      ? 'color-option is-selected'
                                      : 'color-option',
                                  ),
                                ],
                                [
                                  radioOption(
                                    h,
                                    'color',
                                    value,
                                    model.color === value,
                                    Message.SelectedColor({ color: value }),
                                    false,
                                  ),
                                  h.span(
                                    [h.Class(`color-dot color-dot--${value}`)],
                                    [],
                                  ),
                                  colorLabel(value),
                                ],
                              ),
                            ),
                          ),
                        ],
                      )
                    : h.empty,
                  h.fieldset(
                    [h.Class('option-field')],
                    [
                      h.legend(
                        [],
                        [
                          product.category === 'stickers' ? 'Format' : 'Size',
                          product.category === 'shirts'
                            ? h.span(
                                [h.Class('muted')],
                                [` / ${size || 'Select a size'}`],
                              )
                            : h.empty,
                        ],
                      ),
                      h.div(
                        [h.Class('size-options')],
                        product.sizes.map((value) =>
                          h.keyed('label')(
                            value,
                            [h.Class(size === value ? 'is-selected' : '')],
                            [
                              radioOption(
                                h,
                                'size',
                                value,
                                size === value,
                                Message.SelectedSize({ size: value }),
                                true,
                              ),
                              h.span([], [value]),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  h.button(
                    [
                      h.Type('submit'),
                      h.Class('button button--dark button--wide add-button'),
                      h.Disabled(!size),
                    ],
                    [
                      !size
                        ? 'Select a size '
                        : model.isAdded
                          ? 'Add another '
                          : 'Add to cart ',
                      h.span([], [money(product.priceCents)]),
                      arrow(h),
                    ],
                  ),
                  h.div(
                    [h.Class('add-feedback'), h.Role('status')],
                    [
                      model.isAdded
                        ? h.span(
                            [],
                            [
                              'Added to your cart. ',
                              h.a([h.Href(cartRouter())], ['View cart →']),
                            ],
                          )
                        : h.empty,
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class('product-facts')],
                [
                  h.h2([h.Class('eyebrow')], ['THE DETAILS']),
                  h.ul(
                    [],
                    product.details.map((detail) => h.li([], [detail])),
                  ),
                ],
              ),
              h.p(
                [h.Class('demo-disclosure')],
                [
                  h.span([h.Class('status-dot')], []),
                  'A demo object. Nothing will be charged or shipped.',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

/** Shown when the URL names a product that is not in the catalog. */
export const notFoundView = <M>(h: HtmlBuilder<M>) =>
  h.main(
    [h.Class('wrap empty-page'), h.Id('main')],
    [
      h.h1([], ['Object not found.']),
      h.a(
        [h.Class('button button--dark'), h.Href(catalogRouter())],
        ['Back to the collection ', arrow(h)],
      ),
    ],
  );
