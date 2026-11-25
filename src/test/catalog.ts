import type { Product } from '../lib/catalog';

/** A small catalog for tests: one shirt with two colors, one sticker. */
export const shirt: Product = {
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
  sizes: ['XS', 'M', '3XL'],
  images: [
    { color: 'black', src: '/products/right-black.webp', alt: 'Black tee' },
    {
      color: 'off-white',
      src: '/products/right-offwhite.webp',
      alt: 'Off-white tee',
    },
  ],
};
export const sticker: Product = {
  ...shirt,
  id: 'sticker',
  title: 'The fix sticker',
  category: 'stickers',
  priceCents: 400,
  colors: ['off-white'],
  sizes: ['One format'],
  images: [
    { color: 'off-white', src: '/products/fixed-sticker.webp', alt: 'Sticker' },
  ],
};
export const products = [shirt, sticker];
