import type { Update } from 'foldkit';
import type { Html, HtmlBuilder } from 'foldkit/html';
import * as Cart from './cart';
import { headerView, type Section } from './cartView';

/** The header and mini cart on pages outside the shop. Links load shop pages. */
export const Model = Cart.Model;
export const Message = Cart.Message;
export const Flags = Cart.Flags;
export const flags = Cart.flags;
export const subscriptions = Cart.subscriptions;

export const init = (
  flags: Cart.Flags,
): Update.Return<Cart.Model, Cart.Message> => ({
  model: Cart.init(flags),
});

// Outside the shop nobody places an order, so the cart emits no OutMessage here.
export const update = (
  model: Cart.Model,
  message: Cart.Message,
): Update.Return<Cart.Model, Cart.Message> => {
  const cartUpdate = Cart.update(model, message);
  return { model: cartUpdate.model, commands: cartUpdate.commands };
};

export const SECTIONS: ReadonlyArray<Section> = ['Project', 'Articles'];

/** Each page outside the shop names its section, so the view marks the current link. */
export const viewFor =
  (section: Section) =>
  (model: Cart.Model, h: HtmlBuilder<Cart.Message>): Html =>
    headerView(model, { section }, h);
