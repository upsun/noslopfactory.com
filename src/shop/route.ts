import { Option, Schema, pipe } from 'effect';
import { Route } from 'foldkit';
import { defineRouteUnion, literal, string } from 'foldkit/route';
import type { Url } from 'foldkit/url';
import type { Color } from '../lib/catalog';

export const SHOP_PATH = '/shop';

export const AppRoute = defineRouteUnion({
  Catalog: {},
  // `color` keeps the existing `?color=` links. Unknown colors fall back to the default.
  Product: { productId: Schema.String, color: Schema.Option(Schema.String) },
  Cart: {},
  Checkout: {},
  Confirmation: {},
  NotFound: { path: Schema.String },
});
export type AppRoute = typeof AppRoute.Type;

const shop = literal('shop');

export const catalogRouter = pipe(shop, Route.mapTo(AppRoute.Catalog));
export const productRouter = pipe(
  shop,
  Route.slash(literal('products')),
  Route.slash(string('productId')),
  Route.query(
    Schema.Struct({ color: Schema.OptionFromOptionalKey(Schema.String) }),
  ),
  Route.mapTo(AppRoute.Product),
);
export const cartRouter = pipe(
  shop,
  Route.slash(literal('cart')),
  Route.mapTo(AppRoute.Cart),
);
export const checkoutRouter = pipe(
  shop,
  Route.slash(literal('checkout')),
  Route.mapTo(AppRoute.Checkout),
);
export const confirmationRouter = pipe(
  shop,
  Route.slash(literal('confirmation')),
  Route.mapTo(AppRoute.Confirmation),
);

const parse = Route.parseUrlWithFallback(
  Route.oneOf(
    productRouter,
    cartRouter,
    checkoutRouter,
    confirmationRouter,
    catalogRouter,
  ),
  AppRoute.NotFound,
);

/** Static hosting can serve a shop page with or without a trailing slash. */
export const normalizePath = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

export const urlToAppRoute = (url: Url) =>
  parse({ ...url, pathname: normalizePath(url.pathname) });

export const isShopPath = (pathname: string) =>
  pathname === SHOP_PATH || pathname.startsWith(`${SHOP_PATH}/`);

export const productHref = (productId: string, color: Color) =>
  productRouter({ productId, color: Option.some(color) });
