import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { categories, shirtSizes } from './lib/catalog';

const color = z.enum(['black', 'off-white']);
const photo = z.object({
  src: z.string().regex(/^\/products\/[a-z0-9-]+\.(png|webp|jpg)$/),
  alt: z.string().min(1),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z
    .object({
      title: z.string().min(1),
      slogan: z.string().min(1),
      category: z.enum(categories),
      typography: z.enum(['serif', 'mono']),
      description: z.string().min(1),
      details: z.array(z.string().min(1)).min(1),
      priceCents: z.number().int().positive().max(1000000),
      order: z.number().int().nonnegative(),
      colors: z.array(color).min(1),
      sizes: z.array(z.string().min(1)).min(1),
      images: z.array(photo.extend({ color })).min(1),
      backImage: photo.optional(),
    })
    .superRefine((product, ctx) => {
      if (
        new Set(product.colors).size !== product.colors.length ||
        new Set(product.sizes).size !== product.sizes.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Variant options must be unique.',
        });
      }
      for (const value of product.colors) {
        if (
          product.images.filter((image) => image.color === value).length !== 1
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Provide exactly one product image for ${value}.`,
          });
        }
      }
      if (
        product.category === 'shirts' &&
        product.sizes.some(
          (size) => !shirtSizes.some((value) => value === size),
        )
      ) {
        ctx.addIssue({ code: 'custom', message: 'Unknown shirt size.' });
      }
    }),
});

export const collections = { products };
