# Demo shop

Status: approved in the design interview on 2026-10-27. G/ authorized implementation.

Governing issue: https://github.com/upsun/noslopfactory.com/issues/1

## Outcome

Build a convincing, explicitly simulated merchandise shop at `/shop`. Keep `/` as a placeholder for the future educational website. No real transactions, payment fields, personal information, accounts, physical shipping, taxes, or server-side order storage.

## Design and content

Reuse the approved number6.ai design system: Instrument Serif, Geist and Geist Mono, ink `#08090B`, black `#020306`, paper `#F7F7F5`, white, fine neutral borders, 1440px content width, responsive 24/40/64px gutters, pill controls, minimum 44px targets, and sparse spectral focus/status accents. Use light task-oriented shop pages, not the number6 homepage's WebGL world. Keep noslopfactory branding independent.

Products live in validated Astro content collections, including slogans, descriptions, prices in integer cents, variants, images, image descriptions, and display order. Studio product photographs use neutral backgrounds and typographic artwork. Assistant references use a Claude-like serif; technical messages use monospace. Generated artwork approximates the serif style rather than bundling proprietary Claude fonts.

| Category | Message                                       | Price |
| -------- | --------------------------------------------- | ----- |
| Shirt    | You're absolutely right.                      | $32   |
| Shirt    | Flibbertigibbeting…                           | $32   |
| Shirt    | I see the issue now. / back: I introduced it. | $32   |
| Cap      | Thinking…                                     | $24   |
| Cap      | Context lost.                                 | $24   |
| Cap      | Human, allegedly.                             | $24   |
| Sticker  | Tests passed. / small: Tests were not run.    | $4    |
| Sticker  | Fixed. Probably.                              | $4    |
| Sticker  | Source: I made it up.                         | $4    |

Shirts offer black and off-white in XS, S, M, L, XL, 2XL, 3XL. Caps are one size. Stickers have one format.

## Boundaries

Astro owns public documents and build-time content validation. A Foldkit application under `/shop` routes the catalog, product, cart, checkout, and confirmation views. Known shop entry paths are prerendered by Astro so direct links and refreshes work on static hosting. The rest of the site remains Astro. A shared Foldkit cart module provides the cart state, including the header mini cart. As requested by G/ on 2026-11-24, the shop moved from React and TanStack to Foldkit and Effect. See [ADR 0002](../adr/0002-foldkit-effect-shop.md).

The cart persists in versioned browser localStorage. A line is identified by product, color and size. Store only product identifiers, selections and quantity; derive current prices from content. Reject malformed storage and unavailable products/variants, cap quantities at 99, and keep the shop usable when storage is blocked. Reconcile storage events between tabs. No network API is needed.

Simulated checkout presents an order summary and one explicit demo-order action. Confirmation records an immutable snapshot and a locally generated demo reference; it clears the cart once. Keep only the most recent demo confirmation in the current tab's sessionStorage, so confirmation refresh works without storing personal information or creating a real order. An absent confirmation or empty checkout offers a route back to shopping.

As approved by G/ on 2026-10-27 in [issue #4](https://github.com/upsun/noslopfactory.com/issues/4), add a flat $9 USD shipping fee once per non-empty cart. Empty carts have a $0 shipping fee and total. Show subtotal, shipping and total consistently in the mini cart, cart, checkout and fake confirmation. Persist the fee in new receipt snapshots; restore older receipts with no added fee.

Per ADV-2307, shipping is free at a product subtotal of $40 or more, excluding shipping; below $40 the flat $9 fee remains (a $32 subtotal still pays $9, even though its $41 total exceeds $40). The mini cart and cart show an accessible progress bar, capped at 100%, with “Add $x to get free shipping” (USD) below the threshold and “Free shipping unlocked” at or above it, and hide it for an empty cart. It recalculates on every addition, quantity change or removal, in either direction. New receipt snapshots store the shipping that applied at checkout; existing receipts are restored as saved and never recalculated.

## Implementation and verification

1. Add the shop framework integration (React/TanStack at first, Foldkit/Effect since 2026-11-24), shared design tokens, Astro content collection and nine products.
2. Build catalog/category filters, product pages and variant selection, header mini cart and cart page.
3. Implement resilient persistence and checkout/confirmation, then integrate generated product photos.
4. Test variant identity, quantity arithmetic, malformed/stale storage, storage failure, confirmation snapshots and cart clearing. Validate types/content and the static build. Exercise direct entry paths and the complete purchase flow at desktop and mobile widths, including keyboard/dialog behavior. Run independent architecture/correctness/specification review.

This is an additive MINOR feature. The governing issue stays open until G/ explicitly requests completion.
