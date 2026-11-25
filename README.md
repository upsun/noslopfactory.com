# noslopfactory

An Astro website for future AI education, with a simulated merchandise shop at `/shop`. The homepage is intentionally a placeholder. The shop uses [Foldkit](https://foldkit.dev/) and [Effect](https://effect.website/). It takes no real orders and collects no payment or personal information.

## Development

Use Node 22.23.4 or later and pnpm.

```sh
pnpm install
pnpm exec astro dev --background
```

The local site runs at http://localhost:4321. Manage the background process with `pnpm exec astro dev status`, `pnpm exec astro dev logs`, and `pnpm exec astro dev stop`.

```sh
pnpm test
pnpm check
pnpm build
pnpm format:check
```

The build produces static files in `dist/`. Astro generates direct entry pages for the catalog, every product, cart, checkout, and confirmation. Shop navigation after loading is handled by the Foldkit router. When you add a non-product shop route, update both `src/shop/route.ts` and the static path list in `src/pages/shop/[...path].astro`.

## Shop architecture

The shop follows The Elm Architecture (one Model, typed Messages, a pure update function, and Commands for side effects). [ADR 0002](docs/adr/0002-foldkit-effect-shop.md) records why the shop uses Foldkit and Effect.

| Path                               | Contents                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/catalog.ts`               | The product schema that the browser decodes, and the category and size lists that the content collection uses.                        |
| `src/lib/cart.ts`                  | Pure cart rules: lines, quantities, totals, receipts, and the saved data formats.                                                     |
| `src/shop/cart.ts`                 | The cart module that the shop and the homepage header share. It holds storage Commands, the mini cart, and the tab-sync Subscription. |
| `src/shop/main.ts`                 | The shop application: routes, pages, navigation, and focus.                                                                           |
| `src/shop/header.ts`               | The header program for pages outside the shop.                                                                                        |
| `src/components/CatalogData.astro` | Embeds the validated catalog as JSON for the browser programs.                                                                        |

`foldkit` and `@foldkit/vite-plugin` are pinned to exact versions, because Foldkit is pre-1.0. Foldkit requires Effect 4.1. Read the Foldkit changelog before you upgrade either package.

Tests use Foldkit stories for update functions and Foldkit scenes for views. Scene tests do not start a browser.

## Product content

Each product is one Markdown file in `src/content/products/`. Edit its YAML frontmatter to change the title, slogan, description, detail list, price, order, colors, sizes, and product photos. Prices use integer USD cents: `3200` means $32. The Markdown filename is the product ID and URL segment; use a flat, lowercase, hyphenated filename.

The collection schema in `src/content.config.ts` validates content during checks and builds. Each offered color needs exactly one image entry. Shirt sizes are XS, S, M, L, XL, 2XL, and 3XL. Store artwork under `public/products/`, with descriptive image text in the product's `alt` fields. `backImage` is optional; the starter back-print reference is photographed in off-white.

Product images contain the printed words. Changing the slogan in content changes site text, but does not rewrite the words in the photograph. Regenerate the affected photo when changing the artwork. See [image generation notes](docs/product-images.md).

## Deployment caching

HTML and stable public URLs, including product photos and favicons, use `no-cache, max-age=0, must-revalidate`. Browsers may retain a response, but must check it with the server before reuse. Only Astro's generated, fingerprinted files under `/_astro/` use four-week public immutable caching, because a changed file gets a new URL.

This policy is defined in `.upsun/config.yaml` using [Upsun static response headers](https://developer.upsun.com/docs/configure-apps/web/custom-headers). Keep stable filenames outside `/_astro/`; placing an unversioned public file there would give it immutable caching.

After `pnpm build`, run `pnpm check:cache` with the deployment origin (scheme and hostname, without a path, query, or fragment) as its argument. It checks the built HTML routes, a product photo, the favicon, and representative generated JavaScript, CSS and font responses against the real server. A local Astro preview does not apply Upsun's response-header configuration.

Responses already cached under the previous 24-hour policy cannot be revoked remotely. Existing visitors may need one hard refresh or must wait for that old cache entry to expire; later responses use revalidation.

## Cart and simulation

Cart selections are stored at `noslopfactory.cart.v1` in localStorage. Each product, color and size combination is a separate line, with quantities from 1 to 99. Current prices always come from content. Invalid or discontinued variants are discarded when restoring a saved cart. Storage events reconcile other tabs; simultaneous changes use the latest received state.

Checkout creates a local demo receipt and clears the cart. Only the most recent receipt is retained in the current tab's sessionStorage, at `noslopfactory.order.v1`. A confirmation refresh shows the same receipt without submitting another order. The application remains usable in memory if browser storage is blocked, but persistence cannot be guaranteed.

Shipping is free at a product subtotal of $40 USD or more, excluding shipping. Below $40, a non-empty cart adds a flat $9 USD shipping fee once, regardless of quantities or variants. Empty carts have no shipping fee. The mini cart and cart show “Add $x to get free shipping” with an accessible progress bar below the threshold, and a full bar with “Free shipping unlocked” at or above it. The mini cart, cart, checkout and confirmation show the product subtotal, shipping and total. Receipts retain the shipping amount at order time; receipts saved under the earlier flat fee, or from before any fee, keep their original total.

There is no backend, account system, analytics integration, payment provider, or tax calculation. Shipping is simulated; nothing is charged or shipped.

## Design and scope

The visual system reuses number6.ai's approved fonts, neutral palette, grid, spacing, and control rules. Claude-referencing product photography uses an approximate editorial serif, not a bundled proprietary Claude font.

- [Approved scope and verification plan](docs/specs/demo-shop.md)
- [Architecture decision: Foldkit and Effect shop](docs/adr/0002-foldkit-effect-shop.md)
- [Earlier architecture decision: Astro site and React shop](docs/adr/0001-astro-site-react-shop.md), partly replaced by ADR 0002
- [Governing issue](https://github.com/upsun/noslopfactory.com/issues/1)

SemVer impact: additive MINOR feature.
