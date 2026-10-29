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
  expect(screen.queryByRole('progressbar', { hidden: true })).toBeNull();
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 1 item' }));
  const miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(
    miniCart
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow'),
  ).toBe('80');
  expect(miniCart.getByText('Shipping')).toBeTruthy();
  expect(miniCart.getByText('$9')).toBeTruthy();
  expect(miniCart.getByText('$41')).toBeTruthy();
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
  expect(summary.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '80',
  );
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
  expect(summary.queryByText('$9')).toBeNull();
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  expect(summary.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '100',
  );
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
  expect(summary.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(summary.getByText('$9')).toBeTruthy();
  expect(summary.getByText('$41')).toBeTruthy();
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

it('updates free-shipping progress when the cart crosses $40 in either direction', async () => {
  // Start from a fresh shared cart module so this test can restore its own cart.
  vi.resetModules();
  const { default: FreshShopApp } = await import('./ShopApp');
  window.history.replaceState({}, '', '/shop/products/sticker');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const tee: Product = {
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
  const sticker: Product = {
    ...tee,
    id: 'sticker',
    title: 'The fix sticker',
    slogan: 'Fixed it.',
    category: 'stickers',
    priceCents: 400,
    order: 1,
    colors: ['off-white'],
    sizes: ['One format'],
    images: [
      {
        color: 'off-white',
        src: '/products/fixed-sticker.webp',
        alt: 'Sticker',
      },
    ],
  };
  window.localStorage.setItem(
    'noslopfactory.cart.v1',
    JSON.stringify({
      version: 1,
      lines: [{ productId: 'tee', color: 'black', size: 'M', quantity: 1 }],
    }),
  );
  const user = userEvent.setup();
  render(<FreshShopApp products={[tee, sticker]} />);
  await screen.findByRole('heading', { name: sticker.slogan });
  const progress = () =>
    within(screen.getByRole('dialog'))
      .getByRole('progressbar', { name: 'Free shipping progress' })
      .getAttribute('aria-valuenow');

  await user.click(screen.getByRole('button', { name: 'Add to cart $4' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 2 items' }));
  let miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Add $4 to get free shipping')).toBeTruthy();
  expect(progress()).toBe('90');
  expect(miniCart.getByText('$9')).toBeTruthy();
  await user.click(miniCart.getByRole('button', { name: 'Close cart' }));

  await user.click(screen.getByRole('button', { name: /^Add another/ }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 3 items' }));
  miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Free shipping unlocked')).toBeTruthy();
  expect(progress()).toBe('100');
  expect(miniCart.getByText('$0')).toBeTruthy();
  expect(miniCart.getAllByText('$40')).toHaveLength(2);
  await user.click(miniCart.getByRole('link', { name: 'View cart' }));

  await screen.findByRole('heading', { name: 'Your cart.' });
  const summary = within(screen.getByRole('complementary'));
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  await user.click(
    screen.getByRole('button', {
      name: /^Decrease quantity for the fix sticker/,
    }),
  );
  expect(summary.getByText('Add $4 to get free shipping')).toBeTruthy();
  expect(summary.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '90',
  );
  expect(summary.getByText('$36')).toBeTruthy();
  expect(summary.getByText('$9')).toBeTruthy();
  expect(summary.getByText('$45')).toBeTruthy();
  await user.click(
    screen.getByRole('button', {
      name: /^Increase quantity for the fix sticker/,
    }),
  );
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  expect(summary.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '100',
  );
  expect(summary.getByText('$0')).toBeTruthy();

  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = within(screen.getByRole('complementary'));
  expect(checkout.queryByRole('progressbar')).toBeNull();
  expect(checkout.getByText('$0')).toBeTruthy();
  expect(checkout.queryByText('$9')).toBeNull();
  expect(checkout.getAllByText('$40').length).toBeGreaterThanOrEqual(2);
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  const receipt = within(
    screen.getByRole('region', { name: 'Demo order receipt' }),
  );
  expect(receipt.queryByText('$9')).toBeNull();
  expect(receipt.getAllByText('$40').length).toBeGreaterThanOrEqual(2);
  expect(
    JSON.parse(window.sessionStorage.getItem('noslopfactory.order.v1')!),
  ).toMatchObject({ shippingCents: 0, totalCents: 4000 });
});
