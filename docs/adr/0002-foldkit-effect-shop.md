# Build the shop with Foldkit and Effect

Status: accepted, 2026-11-24. Requested by G/. Replaces the React, TanStack Router and TanStack Store parts of [ADR 0001](0001-astro-site-react-shop.md).

## Context

The shop under `/shop` used React, TanStack Router and TanStack Store. G/ asked to port it to Effect and Foldkit, and decided to keep Astro. Foldkit is a TypeScript framework that follows The Elm Architecture: one Model, typed Messages, a pure update function, and Commands for side effects. Foldkit 0.171 requires Effect 4.1 and its own Vite plugin. Foldkit is pre-1.0, so a minor release can change its API.

## Decision

Astro stays the site framework and the owner of product content. Astro still prerenders every shop entry path. Each page embeds the validated catalog as a JSON block, and the browser programs decode it with Effect Schema.

- The shop is one Foldkit application with URL routing, mounted in `#shop-root`. It owns the page title.
- The homepage header is a Foldkit element, mounted in `#site-header-root`. It does not own the URL or the title.
- Both programs share the cart module in `src/shop/cart.ts`. It holds the cart lines, the last receipt, the storage status and the mini cart state.
- Browser storage reads happen once at startup, through Flags (startup data). Writes are Commands. A failed read or write sets a storage status in the Model. It does not stop the shop.
- Saved data is decoded with Effect Schema. The storage keys and formats do not change, so carts and receipts saved before the port continue to work.
- The footer is a static Astro component.

The project pins `foldkit` and `@foldkit/vite-plugin` to exact versions.

## Consequences

The cart rules are pure functions in `src/lib/cart.ts`. Update functions are tested with Foldkit stories, and views with Foldkit scenes. Scene tests do not need a browser, but blur handlers need DOM globals, so the view test file runs in jsdom.

`Dom.showDialog` opens the mini cart with `show()`, not `showModal()`. It sets an inline `inset: 0`, and it does not draw a `::backdrop`. The stylesheet restores the right-side position and draws the page dim with a separate element.

Foldkit intercepts every same-origin link click on a shop page. The shop update loads paths outside `/shop` with a full page load, and handles fragment links on the same page itself.

The shop page loads about 117 KB of gzipped JavaScript, and the homepage about 110 KB. Before the port, the values were about 104 KB and 96 KB.

New shop entry routes must still be added to both `src/shop/route.ts` and the static path list in `src/pages/shop/[...path].astro`. Adding real transactions still requires a separate architecture and explicit approval.
