export const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export const categories = ['shirts', 'caps', 'stickers'] as const;
export type Category = (typeof categories)[number];
export type Color = 'black' | 'off-white';

export interface Product {
  id: string;
  title: string;
  slogan: string;
  category: Category;
  typography: 'serif' | 'mono';
  description: string;
  details: string[];
  priceCents: number;
  order: number;
  colors: Color[];
  sizes: string[];
  images: { color: Color; src: string; alt: string }[];
  backImage?: { src: string; alt: string };
}

export const colorLabel = (color: Color) =>
  color === 'black' ? 'Black' : 'Off-white';
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

export function productImage(
  product: Product,
  color: Color = product.colors[0]!,
) {
  return (
    product.images.find((image) => image.color === color) ?? product.images[0]!
  );
}

export function validVariant(
  product: Product,
  color: unknown,
  size: unknown,
): boolean {
  return (
    product.colors.some((value) => value === color) &&
    product.sizes.some((value) => value === size)
  );
}
