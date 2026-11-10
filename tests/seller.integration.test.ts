import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { POST } from '../src/pages/verkaufen/api/[action]';
import { COOKIE, assertSeller, sessionCookie } from '../src/seller/server';

// This suite only starts a disposable, loopback PB. It never uses .env or a
// configured external backend, and removes both its database and test accounts.
test('seller API and PocketBase rules against disposable real backend', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'meinhaben-seller-'));
  const version = (await readFile('pocketbase/version', 'utf8')).trim();
  const binary = resolve(`pocketbase/.bin/${version}/pocketbase`);
  const args = [`--dir=${directory}`, `--migrationsDir=${resolve('pocketbase/pb_migrations')}`, `--hooksDir=${resolve('pocketbase/pb_hooks')}`];
  const password = randomBytes(24).toString('hex');
  for (const command of [['migrate', 'up'], ['superuser', 'upsert', 'local-test@example.invalid', password]]) {
    const result = spawnSync(binary, [...args, ...command], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
  }
  const socket = createServer(); await new Promise<void>(r => socket.listen(0, '127.0.0.1', r));
  const port = (socket.address() as { port: number }).port; await new Promise<void>(r => socket.close(() => r()));
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(binary, [...args, 'serve', `--http=127.0.0.1:${port}`], { stdio: 'ignore' });
  const oldURL = process.env.POCKETBASE_URL, oldInternal = process.env.POCKETBASE_INTERNAL_URL;
  process.env.POCKETBASE_URL = process.env.POCKETBASE_INTERNAL_URL = url;
  try {
    for (let attempt = 0; ; attempt++) {
      try { if ((await fetch(`${url}/api/health`)).ok) break; } catch {}
      if (attempt > 100) throw new Error('Local test PB failed to start');
      await new Promise(r => setTimeout(r, 50));
    }
    const raw = async (path: string, token = '', method = 'GET', data?: any) => {
      const response = await fetch(`${url}/api/${path}`, { method, headers: { Authorization: token, ...(data && !(data instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined });
      return { status: response.status, body: response.status === 204 ? null : await response.json() };
    };
    const admin = (await raw('collections/_superusers/auth-with-password', '', 'POST', { identity: 'local-test@example.invalid', password })).body.token;
    const create = async (collection: string, data: any) => {
      const result = await raw(`collections/${collection}/records`, admin, 'POST', data); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body;
    };
    const seller = await create('sellers', { email: 'seller@example.invalid', password, passwordConfirm: password, enabled: true });
    const other = await create('sellers', { email: 'other@example.invalid', password, passwordConfirm: password, enabled: true });
    const disabled = await create('sellers', { email: 'disabled@example.invalid', password, passwordConfirm: password, enabled: false });
    const category = await create('categories', { name: 'Technik', slug: 'technik', icon: 'tech', sort_order: 0 });
    const jar = new Map<string, string>();
    const invoke = async (action: string, body: any, origin = 'https://seller.test') => {
      const response = await POST({ params: { action }, url: new URL(`https://seller.test/verkaufen/api/${action}`),
        request: new Request(`https://seller.test/verkaufen/api/${action}`, { method: 'POST', headers: { Origin: origin, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : JSON.stringify(body) }),
        cookies: { get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key: string, value: string) => jar.set(key, value), delete: (key: string) => jar.delete(key) },
      } as any);
      return { status: response.status, body: await response.json() };
    };
    const auth = async (email: string) => { const result = await invoke('login', { email, password }); assert.equal(result.status, 200); return jar.get(COOKIE)!; };
    let token = '';
    await t.test('origin, login, seller authorization and secure cookie', async () => {
      assert.equal((await invoke('save', {}, 'https://evil.test')).status, 403);
      assert.equal((await invoke('save', {})).status, 401);
      assert.equal((await invoke('login', { email: disabled.email, password })).status, 403);
      assert.equal((await raw('collections/sellers/records', '', 'POST', { email: 'signup@example.invalid', password, passwordConfirm: password, enabled: true })).status, 403);
      assert.throws(() => assertSeller({ id: seller.id, collectionName: '_superusers', enabled: true }));
      const context = { url: new URL('https://seller.test/verkaufen/'), cookies: { set: (...args: any[]) => {
        assert.equal(args[0], COOKIE); assert.deepEqual(args[2], { httpOnly: true, secure: true, sameSite: 'strict', path: '/verkaufen', maxAge: 28800 });
      } } };
      sessionCookie(context as any, 'test-token');
      token = await auth(seller.email);
      assert.equal((await raw(`collections/sellers/records/${seller.id}`, token, 'PATCH', { enabled: false })).status, 403);
    });
    const id = 'sellerlisting01'; // exactly 15 chars
    const draft = { id, title: 'Testfund', description: 'Ein schöner Fund.', category: category.id, price_cents: 1000, condition: 'good', details: [] };
    await t.test('draft retries, field allowlist, private reads and ownership', async () => {
      let result = await invoke('save', { ...draft, owner: other.id, published: true });
      assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.owner, seller.id); assert.equal(result.body.published, false);
      result = await invoke('save', { ...draft, title: 'Text nach Retry' }); assert.equal(result.status, 200);
      assert.equal((await raw(`collections/listings/records/${id}`)).status, 404);
      assert.equal((await raw('collections/listings/records')).body.totalItems, 0);
      assert.equal((await raw(`collections/listings/records/${id}`, token, 'PATCH', { owner: other.id })).status, 404);
      assert.equal((await invoke('publish', { id })).status, 400);
      await auth(other.email);
      assert.notEqual((await invoke('save', draft)).status, 200);
      assert.notEqual((await invoke('status', { id, status: 'sold' })).status, 200);
      await auth(seller.email);
    });
    const imageIds = ['sellerphoto0001', 'sellerphoto0002'];
    // Small valid PNG accepted by PocketBase's file validator.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    await t.test('photo retries, public file semantics, reordering and publication hooks', async () => {
      for (const photoId of imageIds) {
        for (let retry = 0; retry < 2; retry++) {
          const form = new FormData(); form.set('id', photoId); form.set('listing', id); form.set('image', new File([png], 'test.png', { type: 'image/png' }));
          const result = await invoke('upload', form); assert.equal(result.status, 200, JSON.stringify(result.body));
        }
      }
      assert.equal((await raw(`collections/listing_images/records/${imageIds[0]}`)).status, 404);
      let own = (await raw('collections/listing_images/records', jar.get(COOKIE)!)).body;
      assert.equal(own.totalItems, 2);
      assert.equal((await fetch(`${url}/api/files/listing_images/${own.items[0].id}/${own.items[0].image}`)).status, 200);
      for (let retry = 0; retry < 2; retry++) assert.equal((await invoke('photos', { id, order: [...imageIds].reverse() })).status, 200);
      own = (await raw('collections/listing_images/records?sort=sort_order', jar.get(COOKIE)!)).body;
      assert.deepEqual(own.items.map((p: any) => p.id), [...imageIds].reverse());
      assert.equal((await invoke('publish', { id })).status, 200);
      assert.equal((await raw(`collections/listings/records/${id}`)).status, 200);
      assert.equal((await invoke('photos', { id, order: [imageIds[1]], remove: [imageIds[0]] })).status, 200);
      assert.equal((await invoke('photos', { id, order: [], remove: [imageIds[1]] })).status, 400);
      assert.equal((await invoke('status', { id, status: 'sold' })).status, 200);
      assert.equal((await raw(`collections/listings/records/${id}`)).body.status, 'sold');
      await auth(other.email);
      assert.equal((await invoke('status', { id, status: 'available' })).status, 403);
      assert.equal((await raw(`collections/listing_images/records/${imageIds[1]}`, jar.get(COOKIE)!, 'PATCH', { alt: 'stolen' })).status, 404);
      await auth(seller.email);
    });
    await t.test('sessions are revalidated after account revocation and logout', async () => {
      await raw(`collections/sellers/records/${seller.id}`, admin, 'PATCH', { enabled: false });
      assert.notEqual((await invoke('status', { id, status: 'available' })).status, 200);
      await raw(`collections/sellers/records/${seller.id}`, admin, 'PATCH', { enabled: true });
      await auth(seller.email);
      assert.equal((await invoke('logout', {})).status, 200); assert.equal(jar.has(COOKIE), false);
      assert.equal((await invoke('status', { id, status: 'available' })).status, 401);
    });
  } finally {
    if (oldURL === undefined) delete process.env.POCKETBASE_URL; else process.env.POCKETBASE_URL = oldURL;
    if (oldInternal === undefined) delete process.env.POCKETBASE_INTERNAL_URL; else process.env.POCKETBASE_INTERNAL_URL = oldInternal;
    child.kill('SIGTERM'); await new Promise(r => child.once('exit', r));
    await rm(directory, { recursive: true, force: true });
  }
});
