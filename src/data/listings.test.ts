import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getListings, getCategories, getMarketplace, PublicContentError } from './listings';

const originalFetch = globalThis.fetch;
const originalPublic = process.env.POCKETBASE_URL;
const originalInternal = process.env.POCKETBASE_INTERNAL_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalPublic === undefined) delete process.env.POCKETBASE_URL; else process.env.POCKETBASE_URL = originalPublic;
  if (originalInternal === undefined) delete process.env.POCKETBASE_INTERNAL_URL; else process.env.POCKETBASE_INTERNAL_URL = originalInternal;
});
const category = { id: 'cat1', name: 'Technik', slug: 'technik', icon: 'tech', sort_order: 0 };
const listing = { id: 'listing1', slug: 'lampe', title: 'Lampe', category: 'cat1', price_cents: 1234,
  condition: 'good', status: 'reserved', description: 'Erster Absatz\n\nZweiter Absatz', details: [{ label: 'Farbe', value: 'Blau' }],
  published: true, published_at: '2026-11-01 12:00:00.000Z' };
const image = { id: 'photo1', collectionId: 'images', listing: 'listing1', image: 'lampe eins.jpg', alt: 'Eine Lampe', sort_order: 0 };
function backend(overrides: Record<string, unknown[]> = {}, totalPages = 1) {
  const calls: URL[] = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(options?.cache, 'no-store');
    assert.equal(options?.headers, undefined);
    assert.equal(url.origin, 'http://private-pb:8090');
    const collection = url.pathname.split('/')[3];
    if (collection === 'listings') assert.equal(url.searchParams.get('filter'), 'published = true');
    if (collection === 'listing_images') assert.equal(url.searchParams.get('filter'), 'listing.published = true');
    const data: Record<string, unknown[]> = { categories: [category], listings: [listing], listing_images: [image], ...overrides };
    return Response.json({ items: url.searchParams.get('page') === '1' ? data[collection] : [], totalPages });
  };
  process.env.POCKETBASE_URL = 'https://photos.example/';
  process.env.POCKETBASE_INTERNAL_URL = 'http://private-pb:8090/';
  return calls;
}

test('maps validated public records to the existing German UI shape and public ordered photo URLs', async () => {
  backend({ listing_images: [{ ...image, id: 'photo2', sort_order: 1 }, image] });
  const [result] = await getListings();
  assert.equal(result.price, 12.34);
  assert.equal(result.condition, 'Gut');
  assert.equal(result.status, 'reserved');
  assert.equal(result.category, 'Technik');
  assert.equal(result.image, 'https://photos.example/api/files/images/photo1/lampe%20eins.jpg');
  assert.equal(result.extraImages.length, 1);
  assert.deepEqual(result.description, ['Erster Absatz', 'Zweiter Absatz']);
  assert.deepEqual(result.details, [['Farbe', 'Blau']]);
});

test('hides drafts defensively even when the API returns one', async () => {
  backend({ listings: [listing, { ...listing, id: 'draft', slug: 'entwurf', published: false }] });
  assert.deepEqual((await getListings()).map(item => item.slug), ['lampe']);
});

test('reads all API pages and re-reads on the next call without content caching', async () => {
  const calls = backend({}, 2);
  await getCategories();
  await getCategories();
  assert.deepEqual(calls.map(url => url.searchParams.get('page')), ['1', '2', '1', '2']);
  backend({ listings: [{ ...listing, title: 'Neu bearbeitet' }] });
  assert.equal((await getListings())[0].title, 'Neu bearbeitet');
});

test('an empty public backend is a successful empty marketplace', async () => {
  backend({ categories: [], listings: [], listing_images: [] });
  assert.deepEqual(await getMarketplace(), { listings: [], categories: [], unavailable: false });
});

test('invalid records, broken relations and missing photos fail closed', async () => {
  for (const overrides of [
    { listings: [{ ...listing, price_cents: -1 }] },
    { categories: [] }, { listing_images: [] },
    { listing_images: [{ ...image, alt: '' }] },
  ] as Record<string, unknown[]>[]) {
    backend(overrides);
    await assert.rejects(getListings(), PublicContentError);
    assert.equal((await getMarketplace()).unavailable, true);
  }
});

test('HTTP, network and malformed response failures expose no private details', async () => {
  for (const fail of [
    async () => new Response('private error', { status: 403 }),
    async () => { throw new Error('http://private-pb:8090 secret'); },
    async () => Response.json({ items: 'bad' }),
  ]) {
    globalThis.fetch = fail;
    await assert.rejects(getListings(), error => error instanceof PublicContentError && !error.message.includes('private'));
    assert.deepEqual(await getMarketplace(), { listings: [], categories: [], unavailable: true });
  }
});
