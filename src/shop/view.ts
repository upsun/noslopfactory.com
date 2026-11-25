import type { Html, HtmlBuilder } from 'foldkit/html';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  freeShippingProgress,
  type Totals,
} from '../lib/cart';
import { money } from '../lib/catalog';
import { catalogRouter } from './route';

type Child = Html | string;

const icon = <M>(
  h: HtmlBuilder<M>,
  size: Readonly<{ width: string; height: string; viewBox: string }>,
  strokeWidth: string,
  paths: ReadonlyArray<string>,
): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Width(size.width),
      h.Height(size.height),
      h.ViewBox(size.viewBox),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth(strokeWidth),
    ],
    paths.map((path) => h.path([h.D(path)], [])),
  );

export const arrow = <M>(h: HtmlBuilder<M>, isDiagonal = false) =>
  icon(h, { width: '20', height: '20', viewBox: '0 0 24 24' }, '1.5', [
    isDiagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6',
  ]);

export const bag = <M>(h: HtmlBuilder<M>) =>
  icon(h, { width: '18', height: '20', viewBox: '0 0 24 24' }, '1.5', [
    'M5 7h14l1 14H4L5 7Z',
    'M8 9V6a4 4 0 0 1 8 0v3',
  ]);

export const asterisk = <M>(h: HtmlBuilder<M>) =>
  icon(h, { width: '28', height: '28', viewBox: '0 0 32 32' }, '2', [
    'M16 2v28M2 16h28M6 6l20 20M6 26 26 6',
  ]);

export const hidden = <M>(h: HtmlBuilder<M>, text: string) =>
  h.span([h.AriaHidden(true)], [text]);

export const orderTotalsView = <M>(
  h: HtmlBuilder<M>,
  totals: Totals,
  totalLabel = 'Total',
): ReadonlyArray<Html> => [
  h.div(
    [h.Class('total-row')],
    [h.span([], ['Subtotal']), h.span([], [money(totals.subtotalCents)])],
  ),
  h.div(
    [h.Class('total-row')],
    [h.span([], ['Shipping']), h.span([], [money(totals.shippingCents)])],
  ),
  h.div(
    [h.Class('total-row order-summary__total')],
    [h.strong([], [totalLabel]), h.strong([], [money(totals.totalCents)])],
  ),
];

/** Progress toward free shipping. Renders nothing for an empty cart. */
export const freeShippingProgressView = <M>(
  h: HtmlBuilder<M>,
  subtotalCents: number,
): Html => {
  if (subtotalCents <= 0) return h.empty;
  const { remainingCents, percent, isUnlocked } =
    freeShippingProgress(subtotalCents);
  const message = isUnlocked
    ? 'Free shipping unlocked'
    : `Add ${money(remainingCents)} to get free shipping`;
  return h.div(
    [h.Class(isUnlocked ? 'free-shipping is-unlocked' : 'free-shipping')],
    [
      h.p([h.Class('free-shipping__message'), h.AriaLive('polite')], [message]),
      h.div(
        [
          h.Class('free-shipping__track'),
          h.Role('progressbar'),
          h.AriaLabel('Free shipping progress'),
          h.AriaValuemin(0),
          h.AriaValuemax(100),
          h.AriaValuenow(percent),
          h.AriaValuetext(
            isUnlocked
              ? 'Free shipping unlocked'
              : `${money(subtotalCents)} of ${money(FREE_SHIPPING_THRESHOLD_CENTS)} toward free shipping`,
          ),
        ],
        [
          h.span(
            [h.Class('free-shipping__fill'), h.Style({ width: `${percent}%` })],
            [],
          ),
        ],
      ),
    ],
  );
};

export const backToCollection = <M>(h: HtmlBuilder<M>) =>
  h.a(
    [h.Class('button button--dark'), h.Href(catalogRouter())],
    ['Back to the collection ', arrow(h)],
  );

export const emptyStateView = <M>(
  h: HtmlBuilder<M>,
  content: Readonly<{
    eyebrow: string;
    title: ReadonlyArray<Child>;
    description: string;
  }>,
) =>
  h.main(
    [h.Class('wrap empty-page'), h.Id('main')],
    [
      h.span([h.Class('eyebrow')], [content.eyebrow]),
      h.h1([], [...content.title]),
      h.p([], [content.description]),
      backToCollection(h),
    ],
  );

export const storageNoticeView = <M>(h: HtmlBuilder<M>, isBlocked: boolean) =>
  isBlocked
    ? h.p(
        [h.Class('storage-notice'), h.Role('status')],
        [
          'Your browser is blocking storage. Your cart works for this visit, but it may not survive a reload.',
        ],
      )
    : h.empty;
