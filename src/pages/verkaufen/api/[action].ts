import type { APIRoute } from 'astro';
import { authenticate, assertSeller, checkOrigin, clearSession, ownListing, pb, photos, photoURL, SellerError, sessionCookie, validId } from '../../../seller/server';
export const prerender = false;
export const POST: APIRoute = async (context) => {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  try {
    checkOrigin(context);
    const action = context.params.action;
    if (action === 'login') {
      const { email, password } = await context.request.json();
      if (typeof email !== 'string' || typeof password !== 'string') throw new SellerError(400, 'Bitte E-Mail und Passwort eingeben.');
      const auth = await pb('collections/sellers/auth-with-password', '', 'POST', { identity: email, password });
      assertSeller(auth.record); sessionCookie(context, auth.token);
      return json({ ok: true });
    }
    const { token, seller } = await authenticate(context);
    if (action === 'logout') { clearSession(context); return json({ ok: true }); }
    if (action === 'upload') {
      const form = await context.request.formData();
      const listing = validId(form.get('listing')), id = validId(form.get('id'));
      await ownListing(listing, token, seller);
      const current = await photos(listing, token);
      const existing = current.find(photo => photo.id === id);
      if (existing) return json({ ...existing, url: photoURL(existing) });
      const file = form.get('image');
      if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new SellerError(400, 'Bitte JPEG, PNG oder WebP bis 10 MB verwenden. HEIC bitte zuerst als JPEG exportieren.');
      if (current.length >= 30) throw new SellerError(400, 'Maximal 30 Fotos pro Anzeige.');
      const body = new FormData();
      body.set('id', id); body.set('listing', listing); body.set('image', file);
      body.set('alt', String(form.get('alt') || 'Artikelfoto').slice(0, 500));
      body.set('sort_order', String(Math.max(0, ...current.map(p => p.sort_order)) + 1));
      const photo = await pb('collections/listing_images/records', token, 'POST', body);
      return json({ ...photo, url: photoURL(photo) });
    }
    const body = await context.request.json(), id = validId(body.id);
    if (action === 'save') {
      const allowed = ['title', 'description', 'category', 'price_cents', 'condition', 'details'] as const;
      const data = Object.fromEntries(allowed.map(key => [key, body[key]]));
      if (!Number.isSafeInteger(data.price_cents) || data.price_cents < 0) throw new SellerError(400, 'Bitte einen gültigen Preis eingeben.');
      let existing;
      try { existing = await ownListing(id, token, seller); }
      catch (error) { if (!(error instanceof SellerError) || error.status !== 404) throw error; }
      const record = existing
        ? await pb(`collections/listings/records/${id}`, token, 'PATCH', data)
        : await pb('collections/listings/records', token, 'POST', { ...data, id, owner: seller.id, slug: `artikel-${id}`, published: false, status: 'available' });
      return json(record);
    }
    await ownListing(id, token, seller);
    if (action === 'photos') {
      const current = await photos(id, token), requested: string[] = body.order, removed: string[] = body.remove || [];
      if (!Array.isArray(removed) || removed.some(p => typeof p !== 'string' || !/^[a-z0-9]{15}$/.test(p))) throw new SellerError(400, 'Ungültige Fotoauswahl.');
      const order = requested;
      if (!Array.isArray(order) || order.some(p => typeof p !== 'string') || new Set(order).size !== order.length || order.some(p => !current.some(photo => photo.id === p))) throw new SellerError(400, 'Ungültige Fotoreihenfolge. Bitte neu laden.');
      if (removed.some(p => order.includes(p))) throw new SellerError(400, 'Widersprüchliche Fotoauswahl.');
      // Preserve photos added by another tab since this editor loaded.
      order.push(...current.filter(p => !order.includes(p.id) && !removed.includes(p.id)).map(p => p.id));
      // Stage above existing positions so unique indexes permit swaps and retries.
      let stage = Math.max(0, ...current.map(p => p.sort_order)) + 1;
      for (const photo of current) await pb(`collections/listing_images/records/${photo.id}`, token, 'PATCH', { sort_order: stage++ });
      for (let i = 0; i < order.length; i++) await pb(`collections/listing_images/records/${order[i]}`, token, 'PATCH', { sort_order: i });
      // Replacement uploads finish first. PB's last-photo hook remains authoritative.
      for (const photo of current.filter(p => removed.includes(p.id))) await pb(`collections/listing_images/records/${photo.id}`, token, 'DELETE');
      return json({ ok: true });
    }
    if (action === 'publish') return json(await pb(`collections/listings/records/${id}`, token, 'PATCH', { published: true, published_at: new Date().toISOString() }));
    if (action === 'status' && ['available', 'reserved', 'sold'].includes(body.status)) return json(await pb(`collections/listings/records/${id}`, token, 'PATCH', { status: body.status }));
    throw new SellerError(400, 'Unbekannte Aktion.');
  } catch (error) {
    return json({ error: error instanceof SellerError ? error.message : 'Anfrage konnte nicht verarbeitet werden.' }, error instanceof SellerError ? error.status : 400);
  }
};
