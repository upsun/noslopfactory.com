import { Schema } from 'effect';

export const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export const categories = ['shirts', 'caps', 'stickers'] as const;
export const colors = ['black', 'off-white'] as const;
export const PHOTO_PATH = /^\/products\/[a-z0-9-]+\.(png|webp|jpg)$/;
export const MAX_PRICE_CENTS = 1000000;
/** The id of the JSON block that carries the catalog into the browser programs. */
export const CATALOG_DATA_ID = 'shop-catalog';

export const Category = Schema.Literals(categories);
export type Category = typeof Category.Type;
export const Color = Schema.Literals(colors);
export type Color = typeof Color.Type;

const PhotoPath = Schema.String.check(Schema.isPattern(PHOTO_PATH));
const Text = Schema.String.check(Schema.isMinLength(1));

/** A product as validated by the Astro content collection and read by the shop. */
export const Product = Schema.Struct({
  id: Text,
  title: Text,
  slogan: Text,
  category: Category,
  typography: Schema.Literals(['serif', 'mono']),
  description: Text,
  details: Schema.Array(Text),
  priceCents: Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: MAX_PRICE_CENTS }),
  ),
  order: Schema.Int,
  colors: Schema.Array(Color),
  sizes: Schema.Array(Text),
  images: Schema.Array(
    Schema.Struct({ color: Color, src: PhotoPath, alt: Text }),
  ),
  backImage: Schema.optionalKey(Schema.Struct({ src: PhotoPath, alt: Text })),
});
export type Product = typeof Product.Type;

export const Products = Schema.Array(Product);

export const colorLabel = (color: Color) =>
  color === 'black' ? 'Black' : 'Off-white';

export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

export const findProduct = (products: ReadonlyArray<Product>, id: string) =>
  products.find((product) => product.id === id);

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
