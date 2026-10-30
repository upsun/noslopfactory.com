// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  within,
  type BoundFunctions,
  type queries,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopApp from './ShopApp';
import { ORDER_KEY } from '../../lib/cart';
import type { Product } from '../../lib/catalog';

// The cart module is a shared singleton that hydrates once, so this flow
// lives in its own file to start from a fresh, storage-backed cart.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const rowValue = (
  scope: BoundFunctions<typeof queries>,
  label: string,
): string | null | undefined =>
  scope.getByText(label).nextElementSibling?.textContent;

it('unlocks free shipping at $40 and carries it through checkout to the receipt', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom does not implement the browser's native dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const product: Product = {
    id: 'tee',
    title: 'The agreement tee',
    slogan: 'You’re absolutely right.',
    category: 'shirts',
    typography: 'serif',
    description: 'A test product.',
    details: ['Cotton'],
    priceCents: 3200,
    order: 0,
    colors: ['black', 'off-white'],
    sizes: ['M', 'L'],
    images: [
      { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
      {
        color: 'off-white',
        src: '/products/right-offwhite.webp',
        alt: 'Off-white tee',
      },
    ],
  };
  const user = userEvent.setup();
  render(<ShopApp products={[product]} />);
  await screen.findByRole('heading', { name: product.slogan });
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));

  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  let miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(rowValue(miniCart, 'Shipping')).toBe('$9');
  await user.click(miniCart.getByRole('button', { name: 'Close cart' }));

  // A second tee crosses the threshold: $64 subtotal, no shipping.
  await user.click(screen.getByRole('button', { name: 'Add another $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 2 items' }));
  miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Free shipping unlocked')).toBeTruthy();
  expect(miniCart.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '100',
  );
  expect(rowValue(miniCart, 'Shipping')).toBe('$0');
  expect(rowValue(miniCart, 'Total')).toBe('$64');
  await user.click(miniCart.getByRole('link', { name: 'View cart' }));

  await screen.findByRole('heading', { name: 'Your cart.' });
  const summary = within(screen.getByRole('complementary'));
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  expect(summary.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '100',
  );
  expect(rowValue(summary, 'Subtotal')).toBe('$64');
  expect(rowValue(summary, 'Shipping')).toBe('$0');
  expect(rowValue(summary, 'Total')).toBe('$64');

  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = within(screen.getByRole('complementary'));
  expect(checkout.queryByRole('progressbar')).toBeNull();
  expect(rowValue(checkout, 'Subtotal')).toBe('$64');
  expect(rowValue(checkout, 'Shipping')).toBe('$0');
  expect(rowValue(checkout, 'Total')).toBe('$64');

  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  const receipt = within(
    screen.getByRole('region', { name: 'Demo order receipt' }),
  );
  expect(rowValue(receipt, 'Subtotal')).toBe('$64');
  expect(rowValue(receipt, 'Shipping')).toBe('$0');
  expect(rowValue(receipt, 'Demo total (USD)')).toBe('$64');
  expect(rowValue(receipt, 'Actually charged')).toBe('$0');
  const stored = JSON.parse(window.sessionStorage.getItem(ORDER_KEY)!);
  expect(stored.shippingCents).toBe(0);
  expect(stored.totalCents).toBe(6400);
});
