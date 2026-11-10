import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterListings } from './filters';
import type { Listing } from './listings';

const base: Listing = { slug: 'lampe', title: 'Schöne Lampe', category: 'Technik', condition: 'Gut', status: 'available',
  price: 20, image: '', imageAlt: '', extraImages: [], description: [], details: [], date: '2026-11-01' };
const listings: Listing[] = [base, { ...base, slug: 'stuhl', title: 'Stuhl', category: 'Wohnen', price: 0, status: 'reserved' },
  { ...base, slug: 'lampe-neu', title: 'Lampe', price: 10 }];
test('shared German URL filters combine search, category, budget, condition and availability', () => {
  assert.deepEqual(filterListings(listings, new URLSearchParams('q=schone&kategorie=Technik&budget=20&zustand=Gut&verfuegbar=1')).map(item => item.slug), ['lampe']);
  assert.equal(filterListings(listings, new URLSearchParams('gratis=1'))[0].slug, 'stuhl');
  assert.equal(filterListings(listings, new URLSearchParams('gratis=1&verfuegbar=1')).length, 0);
});
test('legacy price sorting leaves input untouched and invalid budgets are ignored', () => {
  assert.deepEqual(filterListings(listings, new URLSearchParams('sortierung=price-asc&budget=bad')).map(item => item.price), [0, 10, 20]);
  assert.deepEqual(filterListings(listings, new URLSearchParams('sortierung=price-desc')).map(item => item.price), [20, 10, 0]);
  assert.equal(listings[0], base);
});
