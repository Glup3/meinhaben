import type { Listing } from './listings';

const normalize = (value: string) => value.toLocaleLowerCase('de-AT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

// Preserve shared filter URLs even though the current design has no search toolbar.
export function filterListings(listings: Listing[], params: URLSearchParams): Listing[] {
  const terms = normalize(params.get('q') || '').trim().split(/\s+/).filter(Boolean);
  const category = params.get('kategorie');
  const condition = params.get('zustand');
  const rawBudget = params.get('budget');
  const budget = rawBudget?.trim() && Number.isFinite(Number(rawBudget)) && Number(rawBudget) >= 0 ? Number(rawBudget) : Infinity;
  return listings.filter(item =>
    (!category || category === 'all' || item.category === category) &&
    (!condition || condition === 'all' || item.condition === condition) &&
    (params.get('gratis') !== '1' || item.price === 0) && item.price <= budget &&
    (params.get('verfuegbar') !== '1' || item.status === 'available') &&
    terms.every(term => normalize(`${item.title} ${item.category} ${item.condition}`).includes(term)),
  ).sort((a, b) => params.get('sortierung') === 'price-asc' ? a.price - b.price
    : params.get('sortierung') === 'price-desc' ? b.price - a.price
    : b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
