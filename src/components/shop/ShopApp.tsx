import { useEffect, useState } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import type { Color, Product as ProductData } from '../../lib/catalog';
import Header from '../Header';
import Footer from '../Footer';
import { CatalogContext, useCatalog } from './CatalogContext';
import Catalog from './Catalog';
import Product from './Product';
import Cart from './Cart';
import Checkout from './Checkout';
import Confirmation from './Confirmation';

function RouteEffects() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const products = useCatalog();
  useEffect(() => {
    const id = pathname.split('/products/')[1]?.replace(/\/$/, '');
    const product = products.find((item) => item.id === id);
    const title =
      product?.title ??
      (pathname.includes('/confirmation')
        ? 'Demo order confirmed'
        : pathname.includes('/checkout')
          ? 'Simulated checkout'
          : pathname.includes('/cart')
            ? 'Your cart'
            : 'The shop');
    document.title = `${title} · noslopfactory`;
  }, [pathname, products]);
  useEffect(
    () =>
      router.subscribe('onRendered', ({ pathChanged }) => {
        if (!pathChanged) return;
        const main = document.getElementById('main');
        main?.setAttribute('tabindex', '-1');
        main?.focus({ preventScroll: true });
      }),
    [router],
  );
  return null;
}

function ShopLayout() {
  const products = useCatalog();
  return (
    <>
      <Header products={products} shop />
      <RouteEffects />
      <Outlet />
      <Footer />
    </>
  );
}

const root = createRootRoute({
  component: ShopLayout,
  notFoundComponent: () => (
    <main className="wrap empty-page" id="main">
      <h1>
        Lost in the <em>context.</em>
      </h1>
      <Link to="/" className="button button--dark">
        Back to the collection →
      </Link>
    </main>
  ),
});
const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  component: Catalog,
});
const product = createRoute({
  getParentRoute: () => root,
  path: '/products/$productId',
  component: Product,
  validateSearch: (search: Record<string, unknown>): { color?: Color } =>
    search.color === 'black' || search.color === 'off-white'
      ? { color: search.color }
      : {},
});
const cart = createRoute({
  getParentRoute: () => root,
  path: '/cart',
  component: Cart,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: '/checkout',
  component: Checkout,
});
const confirmation = createRoute({
  getParentRoute: () => root,
  path: '/confirmation',
  component: Confirmation,
});
const routeTree = root.addChildren([
  index,
  product,
  cart,
  checkout,
  confirmation,
]);
const makeRouter = () =>
  createRouter({
    routeTree,
    basepath: '/shop',
    trailingSlash: 'never',
    scrollRestoration: true,
  });
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}

export default function ShopApp({ products }: { products: ProductData[] }) {
  const [router] = useState(makeRouter);
  return (
    <CatalogContext.Provider value={products}>
      <RouterProvider router={router} />
    </CatalogContext.Provider>
  );
}
