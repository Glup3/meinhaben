import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { File } from 'node:buffer';
import { Window } from 'happy-dom';
import { createListingForm } from '../pocketbase/pb_hooks/listing-editor/form.js';

let window;
let page;
let requests;
let revoked;
const createObjectURL = URL.createObjectURL;
const revokeObjectURL = URL.revokeObjectURL;
let send;

beforeEach(async () => {
  window = new Window();
  Object.assign(globalThis, { window, document: window.document });
  requests = [];
  revoked = [];
  URL.createObjectURL = (file) => `blob:${file.name}`;
  URL.revokeObjectURL = (url) => revoked.push(url);
  send = async (_route, options) => {
    requests.push(options.body);
    return { id: 'listing123', published: true, image_count: 2 };
  };
  page = createListingForm({
    collection: () => ({ getFullList: async () => [{ id: 'category123', name: 'Furniture' }] }),
    send: (...args) => send(...args),
  });
  document.body.append(page);
  await Promise.resolve();
});

afterEach(() => {
  window.dispatchEvent(new window.Event('hashchange'));
  window.happyDOM.abort();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

function fill(name, value) {
  const node = page.querySelector(`[name="${name}"]`);
  node.value = value;
  node.dispatchEvent(new window.Event('input'));
}

function validForm() {
  fill('title', 'Schöner großer Tisch');
  fill('description', 'A table in very good condition.');
  fill('category', 'category123');
  fill('price', '19.95');
}

function upload(files) {
  const picker = page.querySelector('[name="images"]');
  Object.defineProperty(picker, 'files', { value: files, configurable: true });
  picker.dispatchEvent(new window.Event('change'));
}

async function submit(action) {
  const form = page.querySelector('form');
  form.dispatchEvent(new window.SubmitEvent('submit', { cancelable: true, submitter: page.querySelector(`[value="${action}"]`) }));
  await new Promise((resolve) => setImmediate(resolve));
}

test('generates a slug while preserving manual edits', () => {
  fill('title', 'Schöner großer Tisch');
  assert.equal(page.querySelector('[name="slug"]').value, 'schoner-grosser-tisch');
  fill('slug', 'my-table');
  fill('title', 'Different title');
  assert.equal(page.querySelector('[name="slug"]').value, 'my-table');
});

test('accepts multiple photos, supports reordering/removal, and releases previews', () => {
  upload([new File(['one'], 'one.png', { type: 'image/png' }), new File(['two'], 'two.webp', { type: 'image/webp' })]);
  assert.equal(page.querySelectorAll('.le-photo').length, 2);
  page.querySelector('[aria-label="Move photo 2 earlier"]').click();
  assert.equal(page.querySelector('.le-filename').textContent, 'two.webp');
  page.querySelector('[aria-label="Remove two.webp"]').click();
  assert.equal(page.querySelectorAll('.le-photo').length, 1);
  assert.ok(revoked.includes('blob:two.webp'));
});

test('blocks unsupported images and the photo limit before uploading', () => {
  upload([new File(['bad'], 'bad.txt', { type: 'text/plain' })]);
  assert.equal(page.querySelectorAll('.le-photo').length, 0);
  assert.match(page.querySelector('[role="status"]').textContent, /JPEG/);
  upload(Array.from({ length: 13 }, (_, index) => new File(['png'], `${index}.png`, { type: 'image/png' })));
  assert.equal(page.querySelectorAll('.le-photo').length, 0);
  assert.match(page.querySelector('[role="status"]').textContent, /up to 12/);
});

test('publishes listing, detail rows and multiple photos in one multipart request', async () => {
  validForm();
  fill('price', '19,95');
  upload([new File(['one'], 'one.png', { type: 'image/png' }), new File(['two'], 'two.png', { type: 'image/png' })]);
  Array.from(page.querySelectorAll('button')).find((button) => button.textContent === '+ Add detail').click();
  fill('detail-label', 'Brand');
  fill('detail-value', 'IKEA');
  await submit('publish');
  assert.equal(requests.length, 1);
  const data = JSON.parse(requests[0].get('listing'));
  assert.equal(data.price_cents, 1995);
  assert.equal(data.publish, true);
  assert.deepEqual(data.details, [{ label: 'Brand', value: 'IKEA' }]);
  assert.equal(requests[0].getAll('images').length, 2);
  assert.equal(page.querySelector('form').hidden, true);
  assert.match(page.querySelector('[role="status"]').textContent, /Published/);
  assert.equal(page.querySelector('a').getAttribute('href'), '#/collections?collection=listings&record=listing123');
});

test('create another starts with an empty form and no retained photos', async () => {
  validForm();
  await submit('draft');
  Array.from(page.querySelectorAll('button')).find((button) => button.textContent === 'Create another listing').click();
  assert.equal(document.querySelector('[name="title"]').value, '');
  assert.equal(document.querySelectorAll('.le-photo').length, 0);
  assert.equal(document.querySelector('form').hidden, false);
});

test('disables the form during upload and prevents double submission', async () => {
  validForm();
  let finish;
  send = async (_route, options) => {
    requests.push(options.body);
    return new Promise((resolve) => { finish = resolve; });
  };
  await submit('draft');
  assert.equal(page.querySelector('fieldset').disabled, true);
  await submit('draft');
  assert.equal(requests.length, 1);
  finish({ id: 'listing123', published: false, image_count: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(page.querySelector('form').hidden, true);
});

test('prevents publication without photos but allows saving a draft', async () => {
  validForm();
  await submit('publish');
  assert.equal(requests.length, 0);
  await submit('draft');
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0].get('listing')).publish, false);
});

test('failed saves retain input and photos and allow retrying', async () => {
  validForm();
  upload([new File(['photo'], 'one.png', { type: 'image/png' })]);
  send = async () => { throw { response: { message: 'Slug already exists', data: { slug: { message: 'Must be unique' } } } }; };
  await submit('publish');
  assert.equal(page.querySelector('[name="title"]').value, 'Schöner großer Tisch');
  assert.equal(page.querySelectorAll('.le-photo').length, 1);
  assert.equal(page.querySelector('fieldset').disabled, false);
  assert.match(page.querySelector('[role="status"]').textContent, /Must be unique/);
});
