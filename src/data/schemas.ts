import { z } from 'zod';

export const categoriesSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    icon: z.enum(['home', 'tech', 'sun']),
    sort_order: z.number().int().nonnegative(),
  });

export const listingsSchema = z.object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    price_cents: z.number().int().nonnegative(),
    condition: z.enum(['new', 'like_new', 'very_good', 'good', 'fair']),
    status: z.enum(['available', 'reserved', 'sold']),
    details: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
    published: z.literal(true),
    published_at: z.string().min(1),
  });

export const listingImagesSchema = z.object({
    id: z.string().min(1),
    collectionId: z.string().min(1),
    listing: z.string().min(1),
    image: z.string().min(1),
    alt: z.string().min(1),
    sort_order: z.number().int().nonnegative(),
  });

