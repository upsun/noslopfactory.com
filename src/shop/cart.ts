import { Array, Clock, Effect, Option, Random, Schema } from 'effect';
import { Command, Dom, Subscription, type Update } from 'foldkit';
import { defineMessageUnion } from 'foldkit/message';
import { modifyFields } from 'foldkit/struct';
import {
  CART_KEY,
  CartLines,
  DemoOrder,
  ORDER_KEY,
  addLine,
  createOrder,
  demoReference,
  encodeCart,
  encodeOrder,
  isValidQuantity,
  lineKey,
  restoreLines,
  restoreOrder,
  setQuantity,
  removeLine,
  type CartLine,
} from '../lib/cart';
import { CATALOG_DATA_ID, Products, type Color } from '../lib/catalog';
import {
  StorageStatus,
  isLocalStorageArea,
  readStorageAtStartup,
  writeStorage,
} from './storage';

export const MINI_CART_ID = 'mini-cart';
const REFERENCE_BYTES = 4;

// MODEL

export const MiniCart = Schema.Literals(['Closed', 'Open']);
export type MiniCart = typeof MiniCart.Type;

/** Where a list of cart lines appears. Both can be in the page at once. */
export const Surface = Schema.Literals(['MiniCart', 'Page']);
export type Surface = typeof Surface.Type;

/** The text of one quantity field while the visitor edits it. */
export const QuantityDraft = Schema.Struct({
  key: Schema.String,
  surface: Surface,
  maybeText: Schema.Option(Schema.String),
  isRejected: Schema.Boolean,
});
export type QuantityDraft = typeof QuantityDraft.Type;

export const Model = Schema.Struct({
  products: Products,
  lines: CartLines,
  maybeOrder: Schema.Option(DemoOrder),
  cartStorage: StorageStatus,
  orderStorage: StorageStatus,
  quantityDrafts: Schema.Array(QuantityDraft),
  miniCart: MiniCart,
});
export type Model = typeof Model.Type;

export const isStorageBlocked = (model: Model) =>
  model.cartStorage === 'Blocked' || model.orderStorage === 'Blocked';

// MESSAGE

export const Message = defineMessageUnion({
  ClickedOpenMiniCart: {},
  ClickedCloseMiniCart: {},
  CancelledMiniCart: {},
  CompletedShowMiniCart: {},
  CompletedCloseMiniCart: {},
  ClickedDecreaseQuantity: { key: Schema.String },
  ClickedIncreaseQuantity: { key: Schema.String },
  UpdatedQuantityInput: {
    key: Schema.String,
    surface: Surface,
    value: Schema.String,
  },
  BlurredQuantityInput: { key: Schema.String, surface: Surface },
  ClickedRemoveLine: { key: Schema.String },
  UpdatedCartInOtherTab: { maybeSavedCart: Schema.Option(Schema.String) },
  SucceededSaveCart: {},
  FailedSaveCart: {},
  SucceededSaveOrder: {},
  FailedSaveOrder: {},
  CompletedGenerateOrderReference: {
    reference: Schema.String,
    createdAt: Schema.String,
  },
});
export type Message = typeof Message.Type;

export const OutMessage = defineMessageUnion({
  PlacedOrder: {},
});
export type OutMessage = typeof OutMessage.Type;

// FLAGS

export const Flags = Schema.Struct({
  products: Products,
  maybeSavedCart: Schema.Option(Schema.String),
  maybeSavedOrder: Schema.Option(Schema.String),
  cartStorage: StorageStatus,
  orderStorage: StorageStatus,
});
export type Flags = typeof Flags.Type;

const decodeCatalog = Schema.decodeUnknownOption(
  Schema.fromJsonString(Products),
);

/** Reads the catalog that Astro embedded in the page, and the saved browser state. */
export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const products = Option.getOrElse(
    decodeCatalog(document.getElementById(CATALOG_DATA_ID)?.textContent ?? ''),
    () => [],
  );
  const cart = yield* readStorageAtStartup('localStorage', CART_KEY);
  const order = yield* readStorageAtStartup('sessionStorage', ORDER_KEY);
  return {
    products,
    maybeSavedCart: cart.maybeValue,
    maybeSavedOrder: order.maybeValue,
    cartStorage: cart.status,
    orderStorage: order.status,
  };
});

// INIT

export const init = (flags: Flags): Model => ({
  products: flags.products,
  lines: restoreLines(Option.getOrNull(flags.maybeSavedCart), flags.products),
  maybeOrder: Option.flatMap(flags.maybeSavedOrder, restoreOrder),
  cartStorage: flags.cartStorage,
  orderStorage: flags.orderStorage,
  quantityDrafts: [],
  miniCart: 'Closed',
});

// COMMAND

export const ShowMiniCart = Command.define('ShowMiniCart', {
  messages: [Message.CompletedShowMiniCart],
  execute: Dom.showDialog(`#${MINI_CART_ID}`, { isModal: true }).pipe(
    Effect.flatMap((isHeld) => (isHeld ? Dom.lockScroll : Effect.void)),
    Effect.ignore,
    Effect.as(Message.CompletedShowMiniCart()),
  ),
});

export const CloseMiniCart = Command.define('CloseMiniCart', {
  messages: [Message.CompletedCloseMiniCart],
  execute: Dom.closeDialog(`#${MINI_CART_ID}`).pipe(
    Effect.flatMap((isReleased) =>
      isReleased ? Dom.unlockScroll : Effect.void,
    ),
    Effect.ignore,
    Effect.as(Message.CompletedCloseMiniCart()),
  ),
});

export const SaveCart = Command.define('SaveCart', {
  args: { lines: CartLines },
  messages: [Message.SucceededSaveCart, Message.FailedSaveCart],
  execute: ({ lines }) =>
    writeStorage('localStorage', CART_KEY, encodeCart(lines)).pipe(
      Effect.as(Message.SucceededSaveCart()),
      Effect.catch(() => Effect.succeed(Message.FailedSaveCart())),
    ),
});

export const SaveOrder = Command.define('SaveOrder', {
  args: { order: DemoOrder },
  messages: [Message.SucceededSaveOrder, Message.FailedSaveOrder],
  execute: ({ order }) =>
    writeStorage('sessionStorage', ORDER_KEY, encodeOrder(order)).pipe(
      Effect.as(Message.SucceededSaveOrder()),
      Effect.catch(() => Effect.succeed(Message.FailedSaveOrder())),
    ),
});

export const GenerateOrderReference = Command.define('GenerateOrderReference', {
  messages: [Message.CompletedGenerateOrderReference],
  execute: Effect.gen(function* () {
    const bytes = yield* Effect.all(
      Array.makeBy(REFERENCE_BYTES, () => Random.nextIntBetween(0, 255)),
    );
    const now = yield* Clock.currentTimeMillis;
    return Message.CompletedGenerateOrderReference({
      reference: demoReference(bytes),
      createdAt: new Date(now).toISOString(),
    });
  }),
});

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>;

const replaceLines = (model: Model, lines: ReadonlyArray<CartLine>) => ({
  model: modifyFields(model, { lines: () => lines }),
  commands: [SaveCart({ lines })],
});

const isDraftFor = (key: string, surface: Surface) => (draft: QuantityDraft) =>
  draft.key === key && draft.surface === surface;

export const draftFor = (model: Model, key: string, surface: Surface) =>
  Array.findFirst(model.quantityDrafts, isDraftFor(key, surface));

const withDraft = (
  model: Model,
  key: string,
  surface: Surface,
  toDraft: (draft: QuantityDraft) => QuantityDraft,
) => {
  const current = Option.getOrElse(draftFor(model, key, surface), () => ({
    key,
    surface,
    maybeText: Option.none<string>(),
    isRejected: false,
  }));
  const next = toDraft(current);
  const others = Array.filter(
    model.quantityDrafts,
    (draft) => !isDraftFor(key, surface)(draft),
  );
  const isEmpty = Option.isNone(next.maybeText) && !next.isRejected;
  return modifyFields(model, {
    quantityDrafts: () => (isEmpty ? others : [...others, next]),
  });
};

// A button or removal settles the line in every surface.
const withoutDrafts = (model: Model, key: string) =>
  modifyFields(model, {
    quantityDrafts: Array.filter((draft) => draft.key !== key),
  });

const lineQuantity = (model: Model, key: string) =>
  Option.match(
    Array.findFirst(model.lines, (line) => lineKey(line) === key),
    { onNone: () => 0, onSome: (line) => line.quantity },
  );

const changeQuantity = (model: Model, key: string, quantity: number) =>
  replaceLines(
    withoutDrafts(model, key),
    setQuantity(model.lines, key, quantity),
  );

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedOpenMiniCart: () => ({
      model: modifyFields(model, { miniCart: () => 'Open' as const }),
      commands: [ShowMiniCart()],
    }),
    ClickedCloseMiniCart: () => closeMiniCart(model),
    CancelledMiniCart: () => closeMiniCart(model),
    CompletedShowMiniCart: () => ({ model }),
    CompletedCloseMiniCart: () => ({ model }),

    ClickedDecreaseQuantity: ({ key }) =>
      changeQuantity(model, key, lineQuantity(model, key) - 1),
    ClickedIncreaseQuantity: ({ key }) =>
      changeQuantity(model, key, lineQuantity(model, key) + 1),
    UpdatedQuantityInput: ({ key, surface, value }) => {
      const quantity = Number(value);
      const isAccepted = value !== '' && isValidQuantity(quantity);
      const drafted = withDraft(model, key, surface, () => ({
        key,
        surface,
        maybeText: Option.some(value),
        isRejected: value !== '' && !isAccepted,
      }));
      return isAccepted
        ? replaceLines(drafted, setQuantity(model.lines, key, quantity))
        : { model: drafted };
    },
    BlurredQuantityInput: ({ key, surface }) => ({
      model: withDraft(model, key, surface, (draft) => ({
        ...draft,
        maybeText: Option.none(),
      })),
    }),
    ClickedRemoveLine: ({ key }) =>
      replaceLines(withoutDrafts(model, key), removeLine(model.lines, key)),

    UpdatedCartInOtherTab: ({ maybeSavedCart }) => ({
      model: modifyFields(model, {
        lines: () =>
          restoreLines(Option.getOrNull(maybeSavedCart), model.products),
        quantityDrafts: () => [],
      }),
    }),
    SucceededSaveCart: () => ({
      model: modifyFields(model, { cartStorage: () => 'Available' as const }),
    }),
    FailedSaveCart: () => ({
      model: modifyFields(model, { cartStorage: () => 'Blocked' as const }),
    }),
    SucceededSaveOrder: () => ({
      model: modifyFields(model, { orderStorage: () => 'Available' as const }),
    }),
    FailedSaveOrder: () => ({
      model: modifyFields(model, { orderStorage: () => 'Blocked' as const }),
    }),

    CompletedGenerateOrderReference: ({ reference, createdAt }) =>
      Option.match(
        createOrder(model.lines, model.products, reference, createdAt),
        {
          onNone: () => ({ model }),
          onSome: (order) => ({
            model: modifyFields(model, {
              maybeOrder: () => Option.some(order),
              lines: () => [],
              quantityDrafts: () => [],
            }),
            commands: [SaveOrder({ order }), SaveCart({ lines: [] })],
            outMessage: OutMessage.PlacedOrder(),
          }),
        },
      ),
  });

// HELPERS FOR THE PARENT

/** Closes the mini cart when it is open, for example before a navigation. */
export const closeMiniCart = (model: Model): Update.Return<Model, Message> =>
  model.miniCart === 'Open'
    ? {
        model: modifyFields(model, { miniCart: () => 'Closed' as const }),
        commands: [CloseMiniCart()],
      }
    : { model };

export type Selection = Readonly<{
  productId: string;
  color: Color;
  size: string;
}>;

/** Adds one item of a variant. An unavailable variant leaves the cart unchanged. */
export const addSelection = (
  model: Model,
  selection: Selection,
): Update.Return<Model, Message> =>
  Option.match(addLine(model.lines, model.products, selection), {
    onNone: () => ({ model }),
    onSome: (lines) => replaceLines(model, lines),
  });

/** Starts a simulated order. The receipt is created when the reference exists. */
export const placeOrder = (model: Model): Update.Return<Model, Message> =>
  model.lines.length
    ? { model, commands: [GenerateOrderReference()] }
    : { model };

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  otherTabCart: Subscription.persistentEntry(
    Dom.streamFromEventFilterMap({
      target: () => window,
      type: 'storage',
      filterMapEvent: (event) =>
        Option.liftPredicate(
          Message.UpdatedCartInOtherTab({
            maybeSavedCart: Option.fromNullishOr(event.newValue),
          }),
          () =>
            isLocalStorageArea(event.storageArea) &&
            (event.key === CART_KEY || event.key === null),
        ),
    }),
  ),
}));
