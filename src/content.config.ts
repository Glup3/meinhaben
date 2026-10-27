import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { pocketbaseLoader } from 'astro-loader-pocketbase';

const url = import.meta.env.POCKETBASE_INTERNAL_URL || import.meta.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

const categories = defineCollection({
  loader: pocketbaseLoader({ url, collectionName: 'categories' }),
  schema: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    icon: z.enum(['home', 'tech', 'sun']),
    sort_order: z.number().int().nonnegative(),
  }),
});

const listings = defineCollection({
  loader: pocketbaseLoader({ url, collectionName: 'listings', filter: 'published = true' }),
  schema: z.object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    price_cents: z.number().int().nonnegative(),
    negotiable: z.boolean(),
    condition: z.enum(['new', 'like_new', 'very_good', 'good', 'fair']),
    status: z.enum(['available', 'reserved', 'sold']),
    handover: z.string().min(1),
    details: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
    published: z.literal(true),
    published_at: z.string().min(1),
  }),
});

const listingImages = defineCollection({
  loader: pocketbaseLoader({ url, collectionName: 'listing_images', filter: 'listing.published = true' }),
  schema: z.object({
    id: z.string().min(1),
    collectionId: z.string().min(1),
    listing: z.string().min(1),
    image: z.string().min(1),
    alt: z.string().min(1),
    sort_order: z.number().int().nonnegative(),
  }),
});

export const collections = { categories, listings, listingImages };
