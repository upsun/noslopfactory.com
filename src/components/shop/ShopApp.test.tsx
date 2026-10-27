// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopApp from './ShopApp';
import type { Product } from '../../lib/catalog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('retains a memory-only cart through header navigation and simulated checkout when storage writes fail', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
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
  await user.tab();
  expect(document.activeElement).toBe(
    screen.getByRole('link', { name: 'noslopfactory home' }),
  );
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  const miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Shipping')).toBeTruthy();
  expect(miniCart.getByText('$9')).toBeTruthy();
  expect(miniCart.getByText('$41')).toBeTruthy();
  expect(miniCart.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(
    miniCart
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow'),
  ).toBe('80');
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'View cart',
    }),
  );
  await screen.findByRole('heading', { name: 'Your cart.' });
  const summary = within(screen.getByRole('complementary'));
  expect(summary.getByText('$32')).toBeTruthy();
  expect(summary.getByText('$9')).toBeTruthy();
  expect(summary.getByText('$41')).toBeTruthy();
  expect(summary.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(
    summary
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow'),
  ).toBe('80');
  await waitFor(() => expect(document.activeElement?.id).toBe('main'), {
    onTimeout: (error) => error,
  });
  expect(screen.getByText(/Your browser is blocking storage/)).toBeTruthy();
  expect(
    screen
      .getByRole('spinbutton', {
        name: 'Quantity for The agreement tee, Black / M',
      })
      .getAttribute('value'),
  ).toBe('1');
  expect(screen.queryByRole('dialog')).toBeNull();
  const quantity = screen.getByRole('spinbutton', {
    name: 'Quantity for The agreement tee, Black / M',
  }) as HTMLInputElement;
  await user.clear(quantity);
  expect(quantity.value).toBe('');
  await user.type(quantity, '2');
  await user.tab();
  expect(quantity.value).toBe('2');
  expect(summary.getAllByText('$64')).toHaveLength(2);
  expect(summary.getByText('$0')).toBeTruthy();
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  expect(
    summary
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow'),
  ).toBe('100');
  await user.clear(quantity);
  await user.tab();
  expect(quantity.value).toBe('2');
  await user.clear(quantity);
  await user.type(quantity, '150');
  expect(screen.getByText(/Use a whole number from 1 to 99/)).toBeTruthy();
  expect(quantity.getAttribute('aria-invalid')).toBe('true');
  expect(quantity.getAttribute('aria-describedby')).toBeTruthy();
  await user.tab();
  expect(quantity.value).toBe('15');
  expect(quantity.getAttribute('aria-invalid')).toBe('false');
  expect(quantity.getAttribute('aria-describedby')).toBeNull();
  expect(screen.getByText(/Quantity restored to 15/)).toBeTruthy();
  expect(screen.getByText(/Use a whole number from 1 to 99/)).toBeTruthy();
  await user.clear(quantity);
  await user.type(quantity, '1');
  await user.tab();
  await user.click(
    within(screen.getByRole('main')).getByRole('link', { name: product.title }),
  );
  await screen.findByRole('heading', { name: product.slogan });
  expect(
    screen.getByRole('button', { name: 'Open cart, 1 item' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'View cart',
    }),
  );
  await screen.findByRole('heading', { name: 'Your cart.' });
  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = within(screen.getByRole('complementary'));
  expect(checkout.getByText('Shipping')).toBeTruthy();
  expect(checkout.getByText('$9')).toBeTruthy();
  expect(checkout.getByText('$41')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  expect(
    screen.getByRole('button', { name: 'Open cart, 0 items' }),
  ).toBeTruthy();
  expect(screen.getByText('Actually charged')).toBeTruthy();
  const receipt = within(
    screen.getByRole('region', { name: 'Demo order receipt' }),
  );
  expect(receipt.getByText('Shipping')).toBeTruthy();
  expect(receipt.getByText('$9')).toBeTruthy();
  expect(receipt.getByText('$41')).toBeTruthy();
  expect(receipt.getByText('$0')).toBeTruthy();
  expect(window.localStorage.length).toBe(0);
});

it('updates both progress displays and checkout totals as the subtotal crosses $40', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
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
    priceCents: 2000,
    order: 0,
    colors: ['black'],
    sizes: ['M'],
    images: [
      { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
    ],
  };
  const user = userEvent.setup();
  render(<ShopApp products={[product]} />);
  await screen.findByRole('heading', { name: product.slogan });
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $20' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'View cart',
    }),
  );
  await screen.findByRole('heading', { name: 'Your cart.' });
  const bar = () =>
    within(screen.getByRole('complementary')).getByRole('progressbar', {
      name: 'Free shipping progress',
    });
  const summary = () => within(screen.getByRole('complementary'));
  const quantity = screen.getByRole('spinbutton', {
    name: 'Quantity for The agreement tee, Black / M',
  }) as HTMLInputElement;
  const setQuantity = async (value: string) => {
    await user.clear(quantity);
    await user.type(quantity, value);
    await user.tab();
  };
  // $20: 50% progress and the $9 fee.
  expect(summary().getByText('Add $20 to get free shipping')).toBeTruthy();
  expect(bar().getAttribute('aria-valuenow')).toBe('50');
  expect(summary().getByText('$9')).toBeTruthy();
  // Exactly $40: unlocked, full bar, no fee.
  await setQuantity('2');
  expect(summary().getByText('Free shipping unlocked')).toBeTruthy();
  expect(bar().getAttribute('aria-valuenow')).toBe('100');
  expect(summary().getByText('$0')).toBeTruthy();
  expect(summary().getAllByText('$40')).toHaveLength(2);
  // Above $40: the bar stays capped at 100%.
  await setQuantity('3');
  expect(bar().getAttribute('aria-valuenow')).toBe('100');
  expect(summary().getAllByText('$60')).toHaveLength(2);
  // Crossing back below $40 restores the message and the fee.
  await setQuantity('1');
  expect(summary().getByText('Add $20 to get free shipping')).toBeTruthy();
  expect(summary().getByText('$29')).toBeTruthy();
  // The mini cart reads from the same store.
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  const miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Add $20 to get free shipping')).toBeTruthy();
  expect(
    miniCart
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow'),
  ).toBe('50');
  await user.click(miniCart.getByRole('button', { name: 'Close cart' }));
  // Checkout at exactly $40. The module-level cart keeps the first test's
  // catalog, so the receipt snapshot is covered by the cart unit tests.
  await setQuantity('2');
  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = within(screen.getByRole('complementary'));
  expect(checkout.getByText('$0')).toBeTruthy();
  // The line item, subtotal and total.
  expect(checkout.getAllByText('$40')).toHaveLength(3);
});
