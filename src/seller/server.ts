import type { APIContext } from 'astro';

export const COOKIE = 'meinhaben_seller';
export const ID = /^[a-z0-9]{15}$/;
export class SellerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type RecordData = { id: string; [key: string]: any };
export function backend() {
  return (process.env.POCKETBASE_INTERNAL_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
}
export async function pb(path: string, token = '', method = 'GET', body?: unknown): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = token;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${backend()}/api/${path}`, {
      method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
  } catch { throw new SellerError(503, 'PocketBase ist gerade nicht erreichbar. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.'); }
  if (!response.ok) {
    throw new SellerError(response.status, response.status === 400
      ? 'Speichern abgelehnt. Bitte Pflichtfelder, Preis, Details und Fotos prüfen. Veröffentlichte Anzeigen brauchen mindestens ein Foto.'
      : response.status === 401 || response.status === 403 ? 'Bitte erneut anmelden.' : 'Datensatz nicht verfügbar oder Zugriff verweigert.');
  }
  return response.status === 204 ? null : response.json();
}
export function sessionCookie(context: APIContext, token: string) {
  context.cookies.set(COOKIE, token, { httpOnly: true, secure: context.url.protocol === 'https:', sameSite: 'strict', path: '/verkaufen', maxAge: 28800 });
}
export function clearSession(context: APIContext) {
  context.cookies.delete(COOKIE, { path: '/verkaufen' });
}
export function assertSeller(record: RecordData) {
  if (record?.collectionName !== 'sellers' || record.enabled !== true) throw new SellerError(403, 'Kein Verkäuferzugang.');
}
export async function authenticate(context: APIContext) {
  const token = context.cookies.get(COOKIE)?.value;
  if (!token) throw new SellerError(401, 'Bitte anmelden.');
  const auth = await pb('collections/sellers/auth-refresh', token, 'POST');
  assertSeller(auth.record);
  sessionCookie(context, auth.token);
  return { token: auth.token as string, seller: auth.record as RecordData };
}
export function checkOrigin(context: APIContext) {
  if (context.request.headers.get('origin') !== context.url.origin || context.request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new SellerError(403, 'Ungültiger Anfrageursprung. Bitte diese Seite neu öffnen.');
  }
}
export function validId(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value)) throw new SellerError(400, 'Ungültige ID.');
  return value;
}
export async function ownListing(id: string, token: string, seller: RecordData) {
  const record = await pb(`collections/listings/records/${validId(id)}`, token);
  if (record.owner !== seller.id) throw new SellerError(403, 'Diese Anzeige gehört einem anderen Verkäufer.');
  return record;
}
export async function allRecords<T extends RecordData = RecordData>(collection: string, query: string, token: string): Promise<T[]> {
  const records: T[] = [];
  for (let page = 1; ; page++) {
    const result = await pb(`collections/${collection}/records?perPage=500&page=${page}&${query}`, token);
    records.push(...result.items);
    if (page >= result.totalPages) return records;
  }
}
export async function photos(id: string, token: string) {
  return allRecords('listing_images', `sort=sort_order&filter=${encodeURIComponent(`listing="${validId(id)}"`)}`, token);
}
export function photoURL(photo: RecordData) {
  const origin = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
  return `${origin}/api/files/listing_images/${photo.id}/${encodeURIComponent(photo.image)}`;
}
