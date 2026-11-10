import { z } from 'zod';
import { categoriesSchema, listingsSchema, listingImagesSchema } from './schemas';

export type ListingStatus = 'available' | 'reserved' | 'sold';
export interface Listing {
  slug: string;
  title: string;
  category: string;
  price: number;
  condition: string;
  status: ListingStatus;
  image: string;
  imageAlt: string;
  extraImages: { src: string; alt: string }[];
  description: string[];
  details: [string, string][];
  date: string;
}

const conditionLabels = {
  new: 'Neu',
  like_new: 'So gut wie neu',
  very_good: 'Sehr gut',
  good: 'Gut',
  fair: 'Gebraucht',
};

export class PublicContentError extends Error {
  constructor() { super('Public marketplace content is temporarily unavailable.'); }
}

// Resolve on every call: production configuration belongs to the Node runtime.
// The API origin never participates in visitor-facing file URLs.
function origins() {
  const publicURL = process.env.POCKETBASE_URL || (import.meta.env?.DEV ? import.meta.env.POCKETBASE_URL : undefined) || 'http://127.0.0.1:8090';
  const apiURL = process.env.POCKETBASE_INTERNAL_URL || (import.meta.env?.DEV ? import.meta.env.POCKETBASE_INTERNAL_URL : undefined) || publicURL;
  return { publicURL: publicURL.replace(/\/$/, ''), apiURL: apiURL.replace(/\/$/, '') };
}

async function readRecords<T>(collection: string, schema: z.ZodType<T>, filter?: string): Promise<T[]> {
  try {
    const records: T[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const url = new URL(`${origins().apiURL}/api/collections/${collection}/records`);
      url.search = new URLSearchParams({ page: String(page), perPage: '500', ...(filter ? { filter } : {}) }).toString();
      // No authentication, cookies, SDK auth store, or cross-request cache.
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Public read failed');
      const result = z.object({
        items: z.array(z.unknown()), totalPages: z.number().int().nonnegative(),
      }).parse(await response.json());
      // Defense in depth if a backend ever returns drafts despite the filter.
      const items = collection === 'listings'
        ? result.items.filter(item => typeof item === 'object' && item !== null && 'published' in item && item.published === true)
        : result.items;
      records.push(...z.array(schema).parse(items));
      totalPages = result.totalPages;
      page++;
    } while (page <= totalPages);
    return records;
  } catch {
    // Keep internal URLs, response bodies and credentials out of rendered errors/logs.
    throw new PublicContentError();
  }
}

export async function getCategories() {
  return (await readRecords('categories', categoriesSchema))
    .sort((first, second) => first.sort_order - second.sort_order || first.id.localeCompare(second.id));
}

export async function getListings(categories?: Category[]): Promise<Listing[]> {
  const [records, resolvedCategories, images] = await Promise.all([
    readRecords('listings', listingsSchema, 'published = true'), categories ?? getCategories(),
    readRecords('listing_images', listingImagesSchema, 'listing.published = true'),
  ]);
  const url = origins().publicURL;
  return records.map(listing => {
    const category = resolvedCategories.find(category => category.id === listing.category);
    const photos = images.filter(image => image.listing === listing.id)
      .sort((first, second) => first.sort_order - second.sort_order || first.id.localeCompare(second.id))
      .map(image => ({
        src: `${url}/api/files/${encodeURIComponent(image.collectionId)}/${encodeURIComponent(image.id)}/${encodeURIComponent(image.image)}`,
        alt: image.alt,
      }));
    if (!category || !photos[0]) throw new PublicContentError();
    return {
      slug: listing.slug, title: listing.title, category: category.name,
      price: listing.price_cents / 100, condition: conditionLabels[listing.condition], status: listing.status,
      image: photos[0].src, imageAlt: photos[0].alt, extraImages: photos.slice(1),
      description: listing.description.split(/\r?\n\s*\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean),
      details: listing.details.map(({ label, value }): [string, string] => [label, value]),
      date: listing.published_at,
    };
  }).sort((first, second) => second.date.localeCompare(first.date) || first.slug.localeCompare(second.slug));
}

export type Category = z.infer<typeof categoriesSchema>;
export async function getMarketplace(): Promise<{ listings: Listing[]; categories: Category[]; unavailable: boolean }> {
  try {
    const categories = await getCategories();
    return { listings: await getListings(categories), categories, unavailable: false };
  } catch {
    return { listings: [], categories: [], unavailable: true };
  }
}

export const statusLabels: Record<ListingStatus, string> = {
  available: 'Noch zu haben',
  reserved: 'Reserviert',
  sold: 'Vergeben',
};
export const formatPrice = (price: number) =>
  price === 0
    ? 'Gratis'
    : `€ ${new Intl.NumberFormat('de-AT', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 }).format(price)}`;
