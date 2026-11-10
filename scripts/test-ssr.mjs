import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';

let title = 'SSR Testlampe';
let published = true;
let down = false;
let reads = 0;
const backend = createServer((req, res) => {
  reads++;
  assert.equal(req.headers.authorization, undefined);
  if (down) { res.writeHead(503).end(); return; }
  const collection = new URL(req.url, 'http://localhost').pathname.split('/')[3];
  const records = {
    categories: [{ id: 'cat1', name: 'Technik', slug: 'technik', icon: 'tech', sort_order: 0 }],
    // Deliberately ignore publication filters to test defense in depth.
    listings: [{ id: 'listing1', slug: 'testlampe', title, category: 'cat1', price_cents: 1200,
      condition: 'good', status: 'available', description: 'Eine schöne Lampe.', details: [],
      published, published_at: '2026-11-01 12:00:00.000Z' }],
    listing_images: [{ id: 'photo1', collectionId: 'images', listing: 'listing1', image: 'lampe.jpg', alt: 'Testlampe', sort_order: 0 }],
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ items: records[collection], totalPages: 1 }));
});
backend.listen(0, '127.0.0.1');
await once(backend, 'listening');
// Reserve an unused port, then let the built runtime bind it.
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const child = spawn(process.execPath, ['dist/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port),
    POCKETBASE_URL: 'https://public-photos.example',
    POCKETBASE_INTERNAL_URL: `http://127.0.0.1:${backend.address().port}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', data => { logs += data; });
child.stderr.on('data', data => { logs += data; });
const origin = `http://127.0.0.1:${port}`;
async function page(path, status = 200) {
  const response = await fetch(origin + path);
  assert.equal(response.status, status, path);
  assert.equal(response.headers.get('cache-control'), 'no-store', path);
  return { response, html: await response.text() };
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(origin + '/healthz')).ok; } catch {}
    if (ready) break;
    if (child.exitCode !== null) throw new Error(logs);
    await setTimeout(50);
  }
  assert.ok(ready, logs);
  assert.equal(reads, 0, 'readiness must not call PB');
  for (const path of ['/', '/anzeigen/', '/inserat/testlampe/']) {
    const { html } = await page(path);
    assert.ok(html.includes(title), path);
    assert.match(html, /noindex, nofollow/);
    assert.ok(html.includes('https://public-photos.example/api/files/images/photo1/lampe.jpg'));
    assert.ok(!html.includes(`127.0.0.1:${backend.address().port}`), 'internal API URL leaked');
  }
  assert.ok(!(await page('/anzeigen/?budget=1')).html.includes('data-slug="testlampe"'), 'URL budget filter');
  assert.ok((await page('/anzeigen/?kategorie=Technik&zustand=Gut&verfuegbar=1&q=lampe')).html.includes('data-slug="testlampe"'), 'combined URL filters');
  const detail = await page('/inserat/testlampe/');
  assert.match(detail.html, /property="og:title" content="SSR Testlampe – Meinhaben"/);
  assert.match(detail.html, /property="og:image" content="https:\/\/public-photos.example/);
  title = 'Sofort geänderte Lampe';
  for (const path of ['/', '/anzeigen/', '/inserat/testlampe/']) {
    assert.ok((await page(path)).html.includes(title), 'edit must appear without rebuilding');
  }
  await page('/inserat/gibt-es-nicht/', 404);
  published = false;
  assert.ok(!(await page('/anzeigen/')).html.includes(title));
  assert.match((await page('/inserat/testlampe/', 404)).html, /Was letzte Seite\?/);
  published = true;
  assert.ok((await page('/inserat/testlampe/')).html.includes(title), 'publishing must be immediate');
  down = true;
  for (const path of ['/', '/anzeigen/', '/inserat/testlampe/']) {
    const { response, html } = await page(path, 503);
    assert.equal(response.headers.get('retry-after'), '30');
    assert.match(html, /Pause/);
  }
  assert.equal((await fetch(origin + '/healthz')).status, 200);
  const beforeStatic = reads;
  assert.equal((await fetch(origin + '/immobilien/')).status, 200);
  assert.equal(reads, beforeStatic, 'static humorous pages must not read PB');
  down = false;
  assert.ok((await page('/')).html.includes(title), 'backend recovery must appear immediately');
  console.log('Built SSR: live edits/publication, drafts, metadata, public images, 404, 503, recovery, no-store and static independence passed.');
} finally {
  child.kill('SIGTERM');
  await once(child, 'exit');
  backend.closeAllConnections();
  await new Promise(resolve => backend.close(resolve));
}
