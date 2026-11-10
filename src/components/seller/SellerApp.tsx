import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { prepareImage } from './images';
import styles from './SellerApp.module.css';

export type Item = { id: string; title: string; description: string; category: string; price_cents: number; condition: string; details: { label: string; value: string }[]; published: boolean; status: string; slug: string };
type Photo = { id: string; listing: string; url: string; file?: File; uploaded?: boolean };
export type Initial = { listings: Item[]; categories: { id: string; name: string }[]; photos: Photo[] };
const conditions: Record<string, string> = { new: 'Neu', like_new: 'Wie neu', very_good: 'Sehr gut', good: 'Gut', fair: 'Gebraucht' };
const statuses: Record<string, string> = { available: 'Verfügbar', reserved: 'Reserviert', sold: 'Verkauft' };
// Stable PB-compatible IDs are retained across uncertain network responses.
function newId() { return Array.from(crypto.getRandomValues(new Uint8Array(15)), n => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join(''); }
async function api(action: string, body: unknown) {
  let response;
  try { response = await fetch(`/verkaufen/api/${action}`, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('Verbindung unterbrochen. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.'); }
  const result = await response.json();
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Bitte unten erneut anmelden. Eingaben und Fotos bleiben hier erhalten.' : result.error);
  return result;
}
export default function SellerApp({ initial, serverError }: { initial: Initial | null; serverError: string }) {
  const objectURLs = useRef(new Set<string>());
  const [listings, setListings] = useState(initial?.listings || []);
  const [allPhotos, setAllPhotos] = useState(initial?.photos || []);
  const [item, setItem] = useState<Item | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [price, setPrice] = useState('0');
  const [free, setFree] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(serverError);
  const [loginOpen, setLoginOpen] = useState(!initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => () => { for (const url of objectURLs.current) URL.revokeObjectURL(url); }, []);
  // Blob URLs remain stable while editing; revoke only removed photos/closed editor.
  function open(record?: Item) {
    if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return;
    const next = record || { id: newId(), title: '', description: '', category: initial?.categories[0]?.id || '', price_cents: 0, condition: 'good', details: [], published: false, status: 'available', slug: '' };
    setItem({ ...next, details: next.details.map(d => ({ ...d })) });
    setPrice((next.price_cents / 100).toFixed(2)); setFree(next.price_cents === 0);
    setPhotos(allPhotos.filter(p => p.listing === next.id)); setDirty(!record); setPreview(false); setMessage(''); setError('');
  }
  function change(patch: Partial<Item>) { setItem(value => value && ({ ...value, ...patch })); setDirty(true); setMessage(''); }
  async function login(event: FormEvent) {
    event.preventDefault(); setPending('Anmelden …'); setError('');
    try {
      await api('login', { email, password }); setPassword('');
      if (!initial) location.reload(); else { setLoginOpen(false); setMessage('Angemeldet. Du kannst jetzt erneut speichern.'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Anmeldung fehlgeschlagen.'); }
    finally { setPending(''); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files || !item) return;
    setPending('Fotos vorbereiten …'); setError(''); setDirty(true);
    const added: Photo[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (photos.length + added.length >= 30) { errors.push('Maximal 30 Fotos pro Anzeige.'); break; }
      try { const image = await prepareImage(file); const url = URL.createObjectURL(image); objectURLs.current.add(url); added.push({ id: newId(), listing: item.id, url, file: image }); }
      catch (cause) { errors.push(cause instanceof Error ? cause.message : 'Foto konnte nicht gelesen werden.'); }
    }
    setPhotos(current => [...current, ...added]); setError(errors.join(' ')); setPending('');
  }
  function move(index: number, delta: number) {
    setPhotos(current => { const next = [...current]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; }); setDirty(true);
  }
  async function save(publish = false) {
    if (!item) return;
    setError(''); setMessage('');
    try {
      const numeric = free ? 0 : Number(price.replace(',', '.'));
      if (!Number.isFinite(numeric) || numeric < 0 || !Number.isSafeInteger(Math.round(numeric * 100)) || (!free && !price.trim())) throw new Error('Bitte einen gültigen Preis eingeben oder Gratis wählen.');
      setPending('Text als Entwurf speichern …');
      let saved: Item = await api('save', { ...item, price_cents: Math.round(numeric * 100) });
      setItem(saved);
      const uploaded: Photo[] = [];
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        if (photo.file && !photo.uploaded) {
          setPending(`Foto ${index + 1} von ${photos.length} hochladen …`);
          const body = new FormData(); body.set('id', photo.id); body.set('listing', item.id); body.set('image', photo.file); body.set('alt', `${item.title} – Foto ${index + 1}`);
          const result = await api('upload', body);
          uploaded.push({ ...photo, url: result.url, uploaded: true });
          setPhotos(current => current.map(p => p.id === photo.id ? { ...p, uploaded: true } : p));
        } else uploaded.push(photo);
      }
      setPending('Fotoreihenfolge speichern …');
      await api('photos', { id: item.id, order: photos.map(p => p.id), remove: allPhotos.filter(p => p.listing === item.id && !photos.some(photo => photo.id === p.id)).map(p => p.id) });
      if (publish) {
        if (!photos.length) throw new Error('Bitte mindestens ein Foto hinzufügen. Der Text ist bereits als Entwurf gespeichert.');
        setPending('Veröffentlichen …'); saved = await api('publish', { id: item.id }); setItem(saved);
      }
      setPhotos(uploaded); setAllPhotos(current => [...current.filter(p => p.listing !== item.id), ...uploaded]);
      setListings(current => [saved, ...current.filter(p => p.id !== item.id)]);
      setDirty(false); setMessage(publish ? 'Veröffentlicht. Deine Anzeige ist sofort im Marktplatz sichtbar.' : saved.published ? 'Änderungen gespeichert und sofort sichtbar.' : 'Entwurf gespeichert.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { setPending(''); }
  }
  async function status(record: Item, next: string) {
    setPending('Status speichern …'); setError('');
    try { const saved = await api('status', { id: record.id, status: next }); setListings(current => current.map(p => p.id === record.id ? saved : p)); setMessage('Status gespeichert.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Status konnte nicht gespeichert werden.'); }
    finally { setPending(''); }
  }
  return <div className={styles.app}>
    <h1>Meine Anzeigen</h1><p>Gute Dinge dürfen weiterziehen.</p>
    <div role="status" aria-live="polite">{pending || message}</div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {initial && <nav className={styles.actions}>
      <button disabled={!!pending} onClick={() => open()}>+ Neue Anzeige</button>
      <button disabled={!!pending} onClick={() => setLoginOpen(!loginOpen)}>Erneut anmelden</button>
      <button disabled={!!pending} onClick={async () => {
        if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen und abmelden?')) return;
        setPending('Abmelden …');
        try { await api('logout', {}); setDirty(false); location.href = '/verkaufen/'; }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Abmelden fehlgeschlagen.'); setPending(''); }
      }}>Abmelden</button>
    </nav>}
    {loginOpen && <form onSubmit={login} className={styles.panel}>
      <h2>Verkäufer-Anmeldung</h2><p>Zugang wird persönlich eingerichtet. Keine öffentliche Registrierung.</p>
      <label>E-Mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Passwort<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={!!pending}>Anmelden</button>
    </form>}
    {initial && !item && <div className={styles.list}>
      {!listings.length && <p>Noch keine Anzeigen. Zeit fürs erste Fundstück!</p>}
      {listings.map(record => <article className={styles.panel} key={record.id}>
        <h2>{record.title}</h2><p>{record.published ? statuses[record.status] : 'Entwurf'} · {record.price_cents === 0 ? 'Gratis' : `${(record.price_cents / 100).toFixed(2)} €`}</p>
        <div className={styles.actions}><button disabled={!!pending} onClick={() => open(record)}>Bearbeiten</button>
          <label>Status<select aria-label={`Status für ${record.title}`} disabled={!!pending} value={record.status} onChange={e => void status(record, e.target.value)}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {record.published && <a href={`/inserat/${record.slug}/`}>Öffnen</a>}
        </div>
      </article>)}
    </div>}
    {item && <form onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset disabled={!!pending} className={styles.editor}>
        <legend>{item.published ? 'Anzeige bearbeiten · Änderungen werden sofort sichtbar' : 'Entwurf bearbeiten'}</legend>
        <div className={styles.actions}><button type="button" onClick={() => { if (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?')) { setItem(null); setDirty(false); setPhotos([]); } }}>Zur Übersicht</button><button type="button" onClick={() => setPreview(!preview)}>{preview ? 'Weiter bearbeiten' : 'Vorschau'}</button></div>
        {preview ? <article className={styles.panel}>
          <h2>{item.title || 'Dein Titel'}</h2><p>{free ? 'Gratis' : `${price} €`} · {conditions[item.condition]}</p>
          {photos.map((photo, i) => <img className={styles.preview} key={photo.id} src={photo.url} alt={`${item.title} – Foto ${i + 1}`} />)}
          <p className={styles.description}>{item.description}</p>
          <dl>{item.details.map((detail, i) => <div key={i}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
          <p>Private Vorschau. Erst „Veröffentlichen“ macht einen Entwurf öffentlich.</p>
        </article> : <>
          <section className={styles.panel}><h2>Fotos</h2><p>Das erste Foto ist das Titelbild. JPEG, PNG oder WebP; große Fotos werden auf 2000 Pixel verkleinert. HEIC bitte als JPEG exportieren.</p>
            <div className={styles.actions}>
              <label className={styles.file}>Kamera<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>
              <label className={styles.file}>Aus Mediathek<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>
            </div>
            <ol className={styles.photos}>{photos.map((photo, index) => <li key={photo.id}>
              <img src={photo.url} alt={`Foto ${index + 1}`} /><span>{index === 0 ? 'Titelbild' : `Foto ${index + 1}`}</span>
              <div className={styles.actions}>
                <button type="button" aria-label={`Foto ${index + 1} nach vorne`} disabled={index === 0 || !!pending} onClick={() => move(index, -1)}>←</button>
                <button type="button" aria-label={`Foto ${index + 1} nach hinten`} disabled={index === photos.length - 1 || !!pending} onClick={() => move(index, 1)}>→</button>
                <button type="button" onClick={() => { setPhotos(current => current.filter(p => p.id !== photo.id)); setDirty(true); }}>Entfernen</button>
              </div>
            </li>)}</ol>
          </section>
          <section className={styles.panel}>
            <label>Titel<input required maxLength={200} value={item.title} onChange={e => change({ title: e.target.value })} /></label>
            <label className={styles.checkbox}><input type="checkbox" checked={free} onChange={e => { setFree(e.target.checked); setDirty(true); }} />Gratis</label>
            {!free && <label>Preis in Euro<input required inputMode="decimal" value={price} onChange={e => { setPrice(e.target.value); setDirty(true); }} /></label>}
            <label>Kategorie<select required value={item.category} onChange={e => change({ category: e.target.value })}>{initial?.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            {!initial?.categories.length && <p role="alert">Bitte zuerst Kategorien im PocketBase-Dashboard anlegen.</p>}
            <label>Zustand<select value={item.condition} onChange={e => change({ condition: e.target.value })}>{Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Beschreibung<textarea required maxLength={20000} rows={7} value={item.description} onChange={e => change({ description: e.target.value })} /></label>
          </section>
          <section className={styles.panel}><h2>Details (optional)</h2>
            {item.details.map((detail, index) => <div className={styles.detail} key={index}>
              <label>Eigenschaft<input required maxLength={200} placeholder="z. B. Marke" value={detail.label} onChange={e => change({ details: item.details.map((d, i) => i === index ? { ...d, label: e.target.value } : d) })} /></label>
              <label>Wert<input required maxLength={500} value={detail.value} onChange={e => change({ details: item.details.map((d, i) => i === index ? { ...d, value: e.target.value } : d) })} /></label>
              <button type="button" onClick={() => change({ details: item.details.filter((_, i) => i !== index) })}>Detail entfernen</button>
            </div>)}
            <button type="button" onClick={() => change({ details: [...item.details, { label: '', value: '' }] })}>+ Detail</button>
          </section>
        </>}
        <div className={styles.actions}>
          <button type="submit">{item.published ? 'Änderungen speichern' : 'Entwurf speichern'}</button>
          {!item.published && <button type="button" onClick={() => void save(true)}>Veröffentlichen</button>}
        </div>
        <p>Text wird zuerst gespeichert, dann Fotos. Bei einem Fehler hier bleiben und erneut speichern. Bereits gespeicherte Fotos werden nicht doppelt angelegt.</p>
      </fieldset>
    </form>}
  </div>;
}
