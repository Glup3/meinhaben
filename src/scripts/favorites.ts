const key = 'meinhaben:favorites:v1';
let saved = new Set<string>();
function read() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    saved = new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch { saved = new Set(); }
}
function render() {
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach(button => {
    const active = saved.has(button.dataset.save!);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${button.dataset.saveTitle} ${active ? 'von der Merkliste entfernen' : 'merken'}`);
    button.title = active ? 'Von der Merkliste entfernen' : 'Auf die Merkliste';
    button.querySelector('[data-save-label]')!.textContent = active ? 'Gemerkt' : 'Merken';
  });
  document.querySelectorAll('[data-saved-count]').forEach(el => { el.textContent = String(saved.size); });
  document.querySelectorAll<HTMLElement>('[data-listing]').forEach(card => { card.dataset.saved = String(saved.has(card.dataset.slug!)); });
  window.dispatchEvent(new Event('favoriteschange'));
}
read();
render();
document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-save]');
  if (!button) return;
  const slug = button.dataset.save!;
  if (saved.has(slug)) saved.delete(slug); else saved.add(slug);
  let persisted = true;
  try { localStorage.setItem(key, JSON.stringify([...saved])); } catch { persisted = false; }
  render();
  const status = document.querySelector('#saved-status');
  if (status) status.textContent = persisted ? (saved.has(slug) ? 'Auf deiner Merkliste gespeichert.' : 'Von deiner Merkliste entfernt.') : 'Merkliste nur für diese Seite verfügbar. Dein Browser erlaubt kein Speichern.';
});
window.addEventListener('storage', event => { if (event.key === key || event.key === null) { read(); render(); } });
window.addEventListener('pageshow', () => { read(); render(); });
