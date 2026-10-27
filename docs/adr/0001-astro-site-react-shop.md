# Keep the React shop inside the Astro site

Status: accepted, 2026-10-27. Approved by G/ in the design interview.

## Context

The main website will contain educational content. Its first interactive section is an explicitly simulated merchandise shop. Product content must stay editable through Astro, and the shop must use React and TanStack Router without introducing payment or personal-information flows.

## Decision

We will retain Astro as the site framework and product-content owner. A React application with TanStack Router will own navigation under `/shop`, with TanStack Store holding a browser-local cart. Astro will prerender each known shop entry path, including product pages, so static hosting can serve direct links and refreshes. Browser storage will retain cart selections and the current tab's last demo receipt. There is no real order service.

## Consequences

Educational pages remain independent of the shop router. The demo needs no backend or customer data, and product prices are derived from validated content instead of trusted browser storage. The interactive shop requires JavaScript. New shop entry routes must be added to both the router and Astro's static-path list; product entry paths are generated automatically from the collection. Adding real transactions would require a separate architecture and explicit approval.
