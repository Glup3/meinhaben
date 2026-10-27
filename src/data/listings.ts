import { getCollection } from 'astro:content';

export type ListingStatus = 'available' | 'reserved' | 'sold';
export interface Listing {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: number;
  negotiable: boolean;
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

export async function getCategories() {
  const records = await getCollection('categories');
  return records.sort((first, second) => first.data.sort_order - second.data.sort_order || first.id.localeCompare(second.id))
    .map(record => record.data);
}

export async function getListings(): Promise<Listing[]> {
  const [records, categories, images] = await Promise.all([
    getCollection('listings'), getCategories(), getCollection('listingImages'),
  ]);
  const url = (import.meta.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
  return records.map(record => {
    const listing = record.data;
    const category = categories.find(category => category.id === listing.category);
    const photos = images.filter(image => image.data.listing === record.id)
      .sort((first, second) => first.data.sort_order - second.data.sort_order)
      .map(image => ({
        src: `${url}/api/files/${image.data.collectionId}/${image.id}/${encodeURIComponent(image.data.image)}`,
        alt: image.data.alt,
      }));
    if (!category || !photos[0]) throw new Error(`Listing "${listing.slug}" needs a category and at least one photo in PocketBase.`);
    return {
      slug: listing.slug,
      title: listing.title,
      subtitle: listing.subtitle,
      category: category.name,
      price: listing.price_cents / 100,
      negotiable: listing.negotiable,
      condition: conditionLabels[listing.condition],
      status: listing.status,
      image: photos[0].src,
      imageAlt: photos[0].alt,
      extraImages: photos.slice(1),
      description: listing.description.split(/\r?\n\s*\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean),
      details: [
        ...listing.details.map(({ label, value }): [string, string] => [label, value]),
        ['Übergabe', listing.handover] as [string, string],
      ],
      date: listing.published_at,
    };
  }).sort((first, second) => second.date.localeCompare(first.date) || first.slug.localeCompare(second.slug));
}

export const statusLabels: Record<ListingStatus, string> = {
  available: 'Noch zu haben',
  reserved: 'Reserviert',
  sold: 'Vergeben',
};
export const formatPrice = (price: number) =>
  price === 0
    ? 'Zu verschenken'
    : `€ ${new Intl.NumberFormat('de-AT', { minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2 }).format(price)}`;
