import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import SellerApp, { type Initial } from './SellerApp';
import { prepareImage } from './images';
const window = new Window();
Object.assign(globalThis, { window, document: window.document, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const originalFetch = globalThis.fetch;
let root: Root;
afterEach(async () => { await act(async () => root?.unmount()); document.body.innerHTML = ''; globalThis.fetch = originalFetch; });
const initial: Initial = {
  categories: [{ id: 'category0000001', name: 'Technik' }], photos: [],
  listings: [{ id: 'sellerlisting01', title: 'Mein Fundstück', description: 'Text bleibt erhalten.', category: 'category0000001', price_cents: 1250, condition: 'good', details: [], published: false, status: 'available', slug: 'fund' }],
};
async function mount() {
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<SellerApp initial={initial} serverError="" />)); return container;
}
async function click(container: Element, label: string) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === label); assert.ok(button, label);
  await act(async () => { button.click(); await new Promise(r => setImmediate(r)); });
}
test('failed upload retains text and photo, retries use stable IDs, and publish waits for photos', async () => {
  Object.assign(globalThis, { createImageBitmap: async () => ({ width: 100, height: 100, close() {} }) });
  let firstUpload = true;
  const uploadIds: string[] = [], saves: any[] = [], calls: string[] = [];
  globalThis.fetch = async (input, options) => {
    const action = String(input).split('/').pop()!; calls.push(action);
    if (action === 'save') {
      saves.push(JSON.parse(String(options?.body)));
      return Response.json({ ...initial.listings[0], ...saves.at(-1) });
    }
    if (action === 'upload') {
      const form = options?.body as FormData; uploadIds.push(String(form.get('id')));
      if (firstUpload) { firstUpload = false; throw new TypeError('Response lost after persisted upload'); }
      return Response.json({ id: form.get('id'), url: 'https://photos.test/photo.png' });
    }
    if (action === 'publish') return Response.json({ ...initial.listings[0], published: true });
    return Response.json({ ok: true });
  };
  const container = await mount(); await click(container, 'Bearbeiten');
  const fileInput = container.querySelector<HTMLInputElement>('input[type=file][multiple]')!;
  const file = new File(['small-image'], 'test.jpg', { type: 'image/jpeg' });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
  await act(async () => { fileInput.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event); await new Promise(r => setImmediate(r)); });
  assert.equal(container.querySelectorAll('ol img').length, 1);
  await click(container, 'Veröffentlichen');
  assert.match(container.querySelector('[role=alert]')!.textContent!, /Eingaben bleiben erhalten/);
  assert.equal(container.querySelector<HTMLInputElement>('input[maxlength="200"]')!.value, 'Mein Fundstück');
  assert.equal(container.querySelectorAll('ol img').length, 1);
  assert.deepEqual(calls, ['save', 'upload']);
  await click(container, 'Veröffentlichen');
  assert.deepEqual(calls, ['save', 'upload', 'save', 'upload', 'photos', 'publish']);
  assert.equal(uploadIds[0], uploadIds[1]); assert.equal(saves[0].id, saves[1].id);
  assert.equal(saves[1].description, 'Text bleibt erhalten.'); assert.equal(saves[1].price_cents, 1250);
  assert.match(container.querySelector('[role=status]')!.textContent!, /Veröffentlicht/);
});
test('unsupported phone image formats explain conversion without uploading', async () => {
  await assert.rejects(prepareImage(new File(['heic'], 'IMG.HEIC', { type: 'image/heic' })), /HEIC\/HEIF zuerst als JPEG exportieren/);
});
