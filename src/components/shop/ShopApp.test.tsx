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

type Scope = ReturnType<typeof within>;
const rowValue = (scope: Scope, label: string) =>
  scope.getByText(label).nextElementSibling?.textContent;
const shippingValue = (scope: Scope) => rowValue(scope, 'Shipping');
const progressValue = (scope: Scope) =>
  scope
    .getByRole('progressbar', { name: 'Free shipping progress' })
    .getAttribute('aria-valuenow');

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

function mockBrowser() {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom does not implement the browser's native dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
}

it('retains a memory-only cart through header navigation and simulated checkout when storage writes fail', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  mockBrowser();
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
  expect(progressValue(summary)).toBe('80');
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
  // Subtotal and total are both $64 once shipping is free.
  expect(summary.getAllByText('$64')).toHaveLength(2);
  expect(shippingValue(summary)).toBe('$0');
  expect(summary.getByText('Free shipping unlocked')).toBeTruthy();
  expect(progressValue(summary)).toBe('100');
  await user.clear(quantity);
  await user.type(quantity, '1');
  await user.tab();
  expect(quantity.value).toBe('1');
  expect(shippingValue(summary)).toBe('$9');
  expect(summary.getByText('$41')).toBeTruthy();
  expect(summary.getByText('Add $8 to get free shipping')).toBeTruthy();
  expect(progressValue(summary)).toBe('80');
  await user.clear(quantity);
  await user.type(quantity, '2');
  await user.tab();
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

it('hides free-shipping progress for an empty cart and carries free shipping through checkout', async () => {
  window.history.replaceState({}, '', '/shop/products/tee');
  window.localStorage.clear();
  window.sessionStorage.clear();
  mockBrowser();
  const user = userEvent.setup();
  render(<ShopApp products={[product]} />);
  await screen.findByRole('heading', { name: product.slogan });
  await user.click(screen.getByRole('button', { name: 'Open cart, 0 items' }));
  const emptyCart = within(screen.getByRole('dialog'));
  expect(emptyCart.getByText('Your cart is empty.')).toBeTruthy();
  expect(emptyCart.queryByRole('progressbar')).toBeNull();
  await user.click(emptyCart.getByRole('button', { name: 'Close cart' }));
  await user.click(screen.getByRole('radio', { name: 'M' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart $32' }));
  await user.click(screen.getByRole('button', { name: 'Add another $32' }));
  await user.click(screen.getByRole('button', { name: 'Open cart, 2 items' }));
  const miniCart = within(screen.getByRole('dialog'));
  expect(miniCart.getByText('Free shipping unlocked')).toBeTruthy();
  expect(progressValue(miniCart)).toBe('100');
  expect(shippingValue(miniCart)).toBe('$0');
  await user.click(miniCart.getByRole('link', { name: 'View cart' }));
  await screen.findByRole('heading', { name: 'Your cart.' });
  await user.click(screen.getByRole('link', { name: 'Simulated checkout' }));
  await screen.findByRole('heading', { name: 'Almost real.' });
  const checkout = within(screen.getByRole('complementary'));
  expect(rowValue(checkout, 'Subtotal')).toBe('$64');
  expect(shippingValue(checkout)).toBe('$0');
  expect(rowValue(checkout, 'Total')).toBe('$64');
  await user.click(screen.getByRole('button', { name: 'Place demo order' }));
  await screen.findByRole('heading', {
    name: 'You’re absolutely not being charged.',
  });
  const receipt = within(
    screen.getByRole('region', { name: 'Demo order receipt' }),
  );
  expect(rowValue(receipt, 'Subtotal')).toBe('$64');
  expect(shippingValue(receipt)).toBe('$0');
  expect(rowValue(receipt, 'Demo total (USD)')).toBe('$64');
  const saved = JSON.parse(
    window.sessionStorage.getItem('noslopfactory.order.v1')!,
  );
  expect(saved.shippingCents).toBe(0);
  expect(saved.totalCents).toBe(6400);
});
