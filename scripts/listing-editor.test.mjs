import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = (await readFile(path.join(root, 'pocketbase/version'), 'utf8')).trim();
const binary = path.join(root, 'pocketbase/.bin', version, 'pocketbase');
const directory = await mkdtemp(path.join(tmpdir(), 'meinhaben-listing-test-'));
const serverArgs = [`--dir=${directory}`, `--hooksDir=${root}/pocketbase/pb_hooks`, `--migrationsDir=${root}/pocketbase/pb_migrations`];
const password = 'local-test-password-only';
let server;
let base;
let token;
let category;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

async function request(route, options = {}, auth = token) {
  const response = await fetch(base + route, {
    ...options,
    headers: { ...(auth ? { Authorization: auth } : {}), ...options.headers },
  });
  return { status: response.status, body: await response.json() };
}

function listing(overrides = {}) {
  return {
    title: 'Test listing', slug: `test-${crypto.randomUUID()}`, description: 'A useful description',
    category, price_cents: 12345, condition: 'very_good', status: 'available',
    details: [{ label: 'Brand', value: 'Test' }], publish: true,
    photos: [{ alt: 'Front' }, { alt: 'Back' }], ...overrides,
  };
}

async function create(data, files = [new Blob([png], { type: 'image/png' }), new Blob([png], { type: 'image/png' })], auth = token) {
  const body = new FormData();
  body.set('listing', JSON.stringify(data));
  files.forEach((file, index) => body.append('images', file, `image-${index}.png`));
  return request('/api/marketplace/listings', { method: 'POST', body }, auth);
}

before(async () => {
  const bootstrap = spawnSync(binary, [...serverArgs, 'superuser', 'create', 'test@example.com', password], { encoding: 'utf8' });
  assert.equal(bootstrap.status, 0, bootstrap.stderr);
  const port = await new Promise((resolve) => {
    const listener = createServer();
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      listener.close(() => resolve(address.port));
    });
  });
  server = spawn(binary, [...serverArgs, 'serve', `--http=127.0.0.1:${port}`, '--automigrate=0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`PocketBase did not start: ${output}`)), 15000);
    server.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`PocketBase exited ${code}: ${output}`)); });
    const read = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Server started at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { base = match[1]; clearTimeout(timeout); resolve(); }
    };
    server.stdout.on('data', read);
    server.stderr.on('data', read);
  });
  const auth = await request('/api/collections/_superusers/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'test@example.com', password }),
  }, null);
  assert.equal(auth.status, 200);
  token = auth.body.token;
  const result = await request('/api/collections/categories/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test', slug: 'test', icon: 'home' }),
  });
  assert.equal(result.status, 200);
  category = result.body.id;
});

after(async () => {
  if (server && server.exitCode === null) {
    await new Promise((resolve) => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
  await rm(directory, { recursive: true, force: true });
});

test('dashboard extension registers a superuser-only page and bypasses stale asset caches', async () => {
  const response = await fetch(base + '/_/extensions.js');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.match(await response.text(), /app\.routes\.superuserOnly\("#\/new-listing"/);
  const form = await fetch(base + '/_/extensions/listing-editor/form.js');
  assert.equal(form.status, 200);
  assert.match(await form.text(), /multiple/);
});

test('anonymous and ordinary authenticated users cannot create listings', async () => {
  assert.equal((await create(listing(), [], null)).status, 401);
  const collection = await request('/api/collections', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test_editors', type: 'auth', passwordAuth: { enabled: true, identityFields: ['email'] } }),
  });
  assert.equal(collection.status, 200);
  const user = await request('/api/collections/test_editors/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'editor@example.com', password, passwordConfirm: password }),
  });
  assert.equal(user.status, 200);
  const auth = await request('/api/collections/test_editors/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'editor@example.com', password }),
  }, null);
  assert.equal(auth.status, 200);
  assert.equal((await create(listing(), [], auth.body.token)).status, 403);
});

test('creates one published listing and multiple ordered photos in one request', async () => {
  const data = listing();
  const result = await create(data);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.image_count, 2);
  assert.equal(result.body.published, true);
  const record = await request(`/api/collections/listings/records/${result.body.id}`, {}, null);
  assert.equal(record.status, 200);
  assert.equal(record.body.price_cents, 12345);
  assert.ok(record.body.published_at);
  const images = await request(`/api/collections/listing_images/records?filter=${encodeURIComponent(`listing="${result.body.id}"`)}&sort=sort_order`, {}, null);
  assert.deepEqual(images.body.items.map((image) => [image.alt, image.sort_order]), [['Front', 0], ['Back', 1]]);
  for (const image of images.body.items) {
    assert.equal((await fetch(`${base}/api/files/${image.collectionId}/${image.id}/${image.image}`)).status, 200);
  }
  assert.equal((await create(data)).status, 400);
});

test('drafts can be saved without photos and are not publicly readable', async () => {
  const result = await create(listing({ publish: false, photos: [] }), []);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.published, false);
  assert.equal((await request(`/api/collections/listings/records/${result.body.id}`, {}, null)).status, 404);
});

test('rejects publishing without photos and excessive photo counts', async () => {
  assert.equal((await create(listing({ photos: [] }), [])).status, 400);
  const files = Array.from({ length: 13 }, () => new Blob([png], { type: 'image/png' }));
  assert.equal((await create(listing({ photos: files.map(() => ({ alt: 'Photo' })) }), files)).status, 400);
});

test('invalid image rolls back the listing and previously saved photo records', async () => {
  const beforeImages = await request('/api/collections/listing_images/records');
  const beforeFiles = await readdir(path.join(directory, 'storage'), { recursive: true });
  const data = listing();
  const result = await create(data, [new Blob([png], { type: 'image/png' }), new Blob(['not an image'], { type: 'text/plain' })]);
  assert.equal(result.status, 400, JSON.stringify(result.body));
  const records = await request(`/api/collections/listings/records?filter=${encodeURIComponent(`slug="${data.slug}"`)}`);
  assert.equal(records.body.totalItems, 0);
  const afterImages = await request('/api/collections/listing_images/records');
  assert.equal(afterImages.body.totalItems, beforeImages.body.totalItems);
  const afterFiles = await readdir(path.join(directory, 'storage'), { recursive: true });
  assert.deepEqual(afterFiles.filter((file) => file.endsWith('.png')).sort(), beforeFiles.filter((file) => file.endsWith('.png')).sort());
});

test('rejects invalid details, price, category, photo description and malformed payloads', async () => {
  for (const overrides of [
    { details: [{ label: '', value: 'No label' }] },
    { price_cents: -1 }, { price_cents: 1.5 }, { category: 'missingcategory' },
    { photos: [{ alt: '' }, { alt: 'Back' }] },
  ]) {
    assert.equal((await create(listing(overrides))).status, 400, JSON.stringify(overrides));
  }
  const body = new FormData();
  body.set('listing', 'not JSON');
  assert.equal((await request('/api/marketplace/listings', { method: 'POST', body })).status, 400);
});
