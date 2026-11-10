# meinhaben

An Astro marketplace for sharing used goods with friends and family.
The German UI loads listings, categories and photo galleries from PocketBase at
request time. Migrations create the collections; content is managed in PocketBase.

## UI development

Follow the local development setup below, then run `pnpm run dev` to preview the
UI at `http://localhost:4321`. PocketBase is needed only when requesting marketplace pages. Checks and builds
work offline; there is no sample-data fallback.

- `src/data/schemas.ts`: validated public PocketBase record schemas.
- `src/data/listings.ts`: maps PocketBase records into the UI model, including
  category names, German condition labels, cents, paragraphs and ordered photos.
- `src/pages/index.astro`: homepage with featured carousel, vertical links, and selected listings.
- `src/pages/anzeigen.astro`: request-rendered results and empty states; shared
  search, category, budget, condition, availability and sorting URL filters still work.
- `src/pages/inserat/[slug].astro`: request-rendered listing pages with accessible photo
  dialogs, item details, related listings, and the WhatsApp contact message.
- `src/components/react/`: hydrated React islands for the featured carousel and
  photo gallery. Astro renders their initial HTML; React owns interactive state.
- `src/styles/global.css`: shared CSS variables for brand colors, Open Sans,
  page gutters and corners, plus base styles and accessibility defaults.

Use descriptive component classes and scoped `<style>` blocks in Astro files.
React islands use colocated `*.module.css` files, imported as `styles`. Keep
responsive rules and interactive states with their component, using data and
ARIA attributes for state and JavaScript hooks. Use `:global()` in Astro only
when a selector deliberately crosses a component boundary, such as an Icon SVG
or a listing grid containing ListingCard components. Keep shared design tokens
in `global.css`; no CSS framework or utility generation is required.

The interface follows willhaben’s marketplace with an original MEINHABEN
speech-bubble logo, locally hosted Open Sans, linked vertical cards beneath the featured carousel. The homepage has a three-slide featured carousel
with arrows, keyboard navigation, and reduced-motion support.
Immobilien, Auto & Motor, and Jobs link to individual humorous pages;
these verticals contain no sale listings.

The visible search bars have been removed. The Marktplatz card and “Alle Anzeigen”
open `/anzeigen/`. Previously shared search, category, availability, budget,
condition and price-sorting URLs still work, including homepage query redirects.
The current design has no filter, sorting or view toolbar.
Listing pages support native sharing with clipboard and visible link fallbacks.

The contact dialog links to the seller's WhatsApp username `glup3` through
`https://wa.me/glup3` and provides a listing-specific message to copy into the chat.
Reserved items allow enquiries; sold items disable the contact button.

Small marketplace jokes appear while listing photos take longer than 600 ms to
load and on the 404 page. Paid, unsold listings also have a “Was letzte Preis?”
button that reveals the asking price with a wink, without changing it or sending
a message. Free and sold listings omit the button.

Upload item photos through the PocketBase dashboard. The homepage carousel uses
photos from available listings; sample listing photos are no longer bundled.
Open Sans is hosted locally under the SIL Open Font License in
`public/fonts/OpenSans-OFL.txt`. The original Inter asset and license are retained.
Search-engine indexing is disabled through page metadata; this is not access
control or authentication.

Link previews are rendered into the response HTML with Open Graph and Twitter
metadata. Listing links use the item's main photo; the homepage uses
`public/images/meinhaben-share.jpg` (1200 × 630). Canonical and image URLs use
the public `site` origin in `astro.config.mjs`. Search indexing stays disabled
with `noindex, nofollow`; crawlers can still fetch pages and images for previews.
After deployment, sharing services may cache older previews until they refresh.

## Local development

Requires Node >=22.23.4 (Node 24 recommended), pnpm 12.16.1, and `unzip` on Linux/macOS.

Enable the pinned pnpm version with Corepack before installing dependencies.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run pb:install
pnpm run pb migrate up
pnpm run pb:dev
```

In another terminal, run `pnpm run dev`. Astro is at `http://localhost:4321` and
PocketBase is at `http://127.0.0.1:8090/_/`. Follow the first-run installer link
printed by PocketBase to create a local superuser. Local data and downloaded
binaries are ignored by Git. The installer verifies the pinned SHA-256 checksum.

Alternatively, run `docker compose -f compose.local.yaml up --build` for local
PocketBase. This binds only to localhost and writes data, migrations and hooks
into the same local directories as the native CLI.

```sh
pnpm test
pnpm run check
pnpm run build
pnpm run preview
```

## Content loading

The homepage, `/anzeigen/` and `/inserat/[slug]` query public PocketBase APIs on
every request through `src/data/listings.ts`. `getListings(): Promise<Listing[]>`
and `getCategories()` retain their exported UI contracts. `getMarketplace()`
returns `{ listings, categories, unavailable }` for page-level error handling.
There is no authenticated shared client, content collection sync, or content cache.
Pagination fetches every public record. Listings and images use publication
filters; draft listings are also rejected locally. Record validation preserves
category, photo, condition, status, price and details requirements. Invalid public
data fails closed with a 503 rather than leaking an incomplete listing.

Missing/unpublished slugs render the existing German 404 with HTTP 404. Backend
errors/timeouts render German retry text with HTTP 503 and `Retry-After: 30`.
Request-rendered responses carry `Cache-Control: no-store`; do not configure a
proxy/CDN HTML cache in front of them. Images and sharing services can have their
own independent caches. Fixed humorous vertical pages and the 404 stay prerendered;
their footer has general marketplace links without live category links. The shared
layout accepts optional `listings` and `categories` props and never fetches data.

`POCKETBASE_URL` is the **runtime public origin** for API reads and uploaded photo
links. Optional `POCKETBASE_INTERNAL_URL` overrides only server API reads. It must
never be used in image/social URLs. Node resolves these environment variables on
each call; `.env` is also supported in Astro development. `SITE_URL` remains a
**build-time** canonical origin. No PB credentials belong on the public website.
Content edits, uploads, publication changes and deletions appear on the next page
request without a rebuild or restart. In-flight requests can observe concurrent
edits across the separate public API reads; a transient inconsistent publication
returns 503 and the next request retries from the backend.

The Dockerfile builds without contacting PB and runs Astro's Node standalone
server on `0.0.0.0:4321` as the unprivileged `node` user. Start a built site with
`pnpm start` (set `HOST`/`PORT` as needed). `/healthz` checks process readiness
independently of PB, so a backend outage does not cause website restart loops.
Only `SITE_URL` is a Docker build argument; PB URLs are runtime environment values.
Normal Docker build caching can stay enabled; `CONTENT_VERSION` is removed.

For the complete local Docker stack, configure the backend's `PB_ADMIN_*` and
`PB_ENCRYPTION_KEY` variables, then run:

```sh
docker compose up -d --build
```

The website is at `http://localhost:8080`, PocketBase at `http://localhost:8090`.
The website reads `http://pocketbase:8090` on the private Compose network while
visitor image links use `http://localhost:8090`. Host networking and a running PB
during image build are no longer required. `compose.local.yaml` remains the
localhost-only PB alternative for `pnpm run dev`.

After `pnpm run build`, run `pnpm run test:ssr` to exercise the built Node runtime
against an isolated HTTP fixture, including live changes, drafts, missing pages,
metadata and outages. No production database is read or modified by these tests.

## Private seller interface

Open `/verkaufen/` for the mobile seller flow: camera/library photos, ordered
cover, draft save, preview, publish, and own-listing edits/reserved/sold status.
Accounts are manually created in the locked `sellers` auth collection; there is
no public signup. Apply the backend migration **before** deploying this website,
then bootstrap accounts and assign owners to existing listings in the dashboard.
See [seller setup, rollout, security and recovery](docs/seller.md) for the exact
steps, HTTP-only session/CSRF boundaries, public-file semantics and local tests.
The website needs no superuser credentials. Seller tests use a disposable local
PocketBase and never write production.

## Editing marketplace content

- `categories`: name, unique slug, existing icon key (`home`, `tech`, `sun`),
  and numeric filter order.
- `listings`: unique slug, title, plain-text description (blank lines
  separate paragraphs), category, integer `price_cents`,
  condition, availability status, JSON details, publication flag/date.
  `price_cents = 0` means free. Conditions use `new`, `like_new`, `very_good`,
  `good`, `fair`; status uses `available`, `reserved`, `sold`.
- `listing_images`: listing relation, one uploaded image, alt text and unique
  numeric position per listing. The lowest position is the cover photo.

Create a listing as an unpublished draft with a status and `details` array
(`[]` is valid). Save it, upload its photos, set `published_at`, then publish.
Hooks validate details and require a date and existing photo before publishing.
Deleting or reassigning the last photo of a published listing is rejected in a
transaction; unpublish first or add another photo. Deleting the whole listing
still cascades normally.
Details use `[{"label":"Marke","value":"Patagonia"}]`. Keep published slugs stable to
avoid breaking shared links. Deleting a listing deletes its photo records too.

Enabled sellers may write only their own listings and photos; categories and
seller accounts remain managed by superusers. Public list/view rules hide draft
listings and their photo records; an owner can also read their own drafts. Uploaded files are ordinary
public files: knowing a draft photo URL still permits access. Use protected files
and authorized delivery if draft images must be confidential.

New databases start with empty collections. Create categories, listings and
photos manually in PocketBase. The former example seed migration has been
removed; this does not delete examples already stored in an existing database.
Delete those listings through the dashboard; related photo records are deleted
automatically. Existing categories can be kept for real listings.

## Schema migrations and hooks

- `pocketbase/pb_migrations/`: committed JavaScript migrations.
- `pocketbase/pb_hooks/`: committed PocketBase JavaScript hooks.
- `pocketbase/pb_data/`: local SQLite databases, uploads and backups; never commit.
- `pocketbase/version` and `pocketbase/checksums.txt`: pinned PocketBase release.

While `pnpm run pb:dev` is running, schema changes in the local dashboard generate
migration files automatically. Review and commit those files alongside code.
Create a custom data migration with:

```sh
pnpm run pb migrate create your_migration_name
pnpm run pb migrate up
```

Production runs `migrate up` before serving and disables automatic generation.
Only pending migrations run; the applied history lives in the persistent database.
Make production schema changes through committed migrations rather than editing
the production dashboard. Hooks ship in the image and take effect on redeploy.
Export a schema if needed with `pnpm run pb migrate collections`.

Back up before schema changes. Rolling back an application image does **not**
reverse migrations. If a reviewed migration has a safe down function, stop the
service and run `pocketbase migrate down N` against the same data with the same
PocketBase version and encryption environment; otherwise restore a backup.
Never run multiple PocketBase processes against the same SQLite data directory.

## Coolify deployment

Public source: <https://github.com/Glup3/meinhaben>, branch `main`, on
`ditto-cloud-1`. Production uses two independent Coolify applications from this
repository:

| Resource | Build configuration | Purpose |
| --- | --- | --- |
| `meinhaben website` | Dockerfile, `/Dockerfile`, port 4321 | Rolling website deployments at <https://meinhaben.glup3.dev> |
| `meinhaben PocketBase` | Docker Compose, `/docker-compose.production.yaml` | Existing database and uploads at <https://meinhaben-admin.ditto.glup3.dev> |

### Website

This branch changes configuration files and documents rollout only; it does not
deploy or change the saved Coolify resources. At the authorized rollout:

1. Keep **build-time** `SITE_URL=https://meinhaben.glup3.dev`. Set **runtime**
   `POCKETBASE_URL=https://meinhaben-admin.ditto.glup3.dev`. Leave
   `POCKETBASE_INTERNAL_URL` unset unless a verified private service address is
   reachable from the independent website container. Remove PB URL build args.
2. Change the application's exposed port from **80 to 4321** and readiness path
   from `/` to **`/healthz`**, host `127.0.0.1`, port 4321. Keep the 60-second
   start period, 5-second interval/timeout, 12 retries, timestamped container names,
   no host port mapping, and 30-second graceful shutdown allowance.
3. Re-enable Docker build caching; remove `CONTENT_VERSION` if configured. Keep
   public `SITE_URL` build-argument injection enabled. No website persistent
   storage or database credentials are needed for public rendering.
4. Let Coolify manage normal domain/HTTPS/compression labels. Remove obsolete
   Nginx-specific settings and any old custom retry/health/priority labels. Do not
   enable shared HTML caching. The Node adapter serves the built static assets.
5. Build and deploy only after approval. Verify readiness, homepage, filters,
   listing galleries, share metadata, noindex, missing-slug 404 and draft hiding.
   Make a reversible content edit in a **test backend** and confirm it appears on
   the next request; test an unavailable backend for German 503/no-store behavior.
   Verify rolling updates under traffic; readiness alone does not prove no drops.

The public SSR conversion alone needs no backend schema change. The stacked
seller interface adds a committed migration: follow the backend-first rollout
in [docs/seller.md](docs/seller.md) before enabling it. Retain the existing backend
resource, volume and credentials. To roll back, restore the
previous website image and port 80/readiness `/` configuration; that old static
image serves its build-time snapshot. Rollback does not require a database restore.

The signed GitHub push webhook deploys the website for frontend/build changes.
Its watch paths cover `src/**`, `public/**`, `deploy/**`, `Dockerfile`,
`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `astro.config.mjs`,
`tsconfig.json`, and `.dockerignore` (one pattern per line in Coolify).

### PocketBase and persistent data

The backend keeps the original Coolify resource UUID
`feg5q24qi2u3qvndetgwyqay` and volume
`feg5q24qi2u3qvndetgwyqay_pocketbase-data`, mounted at `/pb/pb_data`.
**Do not recreate the resource, rename its volume key, delete its storage, or
start another PocketBase process against that volume.** The production Compose
file intentionally retains the original `pocketbase_data` key. No database is
copied into a new service during the split.

Keep the existing runtime `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, and
`PB_ENCRYPTION_KEY` values in this resource. Never rotate the encryption key as
part of a deployment or store credentials in Git. The entrypoint applies pending
migrations and updates the bootstrap superuser before starting PocketBase.
Startup does not seed or reset content.

Backend auto-deployment is disabled deliberately. After reviewing and backing up
changes to `pocketbase/**` or `docker-compose.production.yaml`, deploy PocketBase
first, verify its health and migrations, then deploy the website. This explicit
ordering prevents runtime reads from racing an incompatible schema migration. Backend
updates still have a short interruption; routine website deployments do not
restart PocketBase. Keep migrations compatible with the old website during
rollout. Verify health at `/api/health`.

### Pull-request preview environments

PR previews use native Coolify Preview Deployments on `meinhaben website`
(`d3avyblhxxysp27wc4di52uh`), using the same Dockerfile as production. Manage them
in the website's [Preview Deployments dashboard](https://dashboard.coolify.glup3.dev/project/jrha8ret63grhiljvtpgryhc/environment/iqxg8hbhreflwv5yc6gppewm/application/d3avyblhxxysp27wc4di52uh/preview-deployments).
There is no separate preview application, Compose preview stack, or GitHub
Actions preview workflow.

Enable member-only Preview Deployments, keep public fork deployments disabled,
and use the URL template `{{pr_id}}.{{domain}}`. Wildcard DNS and the signed
repository webhook (`push` and `pull_request` events) provide website URLs such
as `https://42.meinhaben.glup3.dev`. Closing a PR removes its website preview.

Set these preview environment variables in the website application,
separately from its production variables:

| Variable | Preview value |
| --- | --- |
| `SITE_URL` (build-time) | `$COOLIFY_URL` |
| `POCKETBASE_URL` (runtime) | `https://meinhaben-admin.ditto.glup3.dev` |

Keep `SITE_URL` non-literal so Coolify resolves `$COOLIFY_URL` to the current
preview's HTTPS URL. Do not set `POCKETBASE_INTERNAL_URL` or any `PB_ADMIN_*` or
`PB_ENCRYPTION_KEY` variables on the website application. Each preview reads the production public PocketBase API at request time and uses
the production origin for uploaded images. Apply port 4321 and `/healthz` to previews too. Production remains the only deployed
PocketBase instance; previews have no database containers or persistent volumes.
Changes to production content appear in a preview on the next request. Any
authenticated writes made through preview code affect production data too.

`docker-compose.yaml` is only the complete local development stack; it is not
used for Coolify previews. Production rolling updates remain independent of PR
preview deployments.

### Migration and recovery

Before splitting production, create a PocketBase backup containing SQLite and
uploads, download it off the deployment server, and verify the archive. Bring
up and check the independent website before switching the original resource to
`docker-compose.production.yaml`. Keep the exact backend resource and volume.
Compare all content records and uploaded files before and after the migration.

To reverse the split, stop routing the independent website and restore the
original resource's `/docker-compose.yaml` configuration and website domain.
Retain the existing backend volume and credentials. Do not restore an older
data backup merely to undo deployment configuration; that would discard newer
edits. Database recovery is a separate operation described below.

## Backups and restore

Use PocketBase **Settings → Backups** to create/download a consistent backup
before migrations and configure scheduled backups. Configure an external
S3-compatible destination there for off-server storage. This starter does not
provision a bucket or enable an off-server backup schedule. A persistent volume
alone does not protect against server loss.

To restore, save a current backup, put the site into maintenance if needed, and
use PocketBase's backup restore action in the dashboard. For full server recovery,
redeploy the same pinned PocketBase version and encryption key with a fresh
volume, bootstrap the administrator, then upload/restore the backup. Restore
with matching application code and migrations before upgrading. Store backup
archives and the encryption key separately and test restoration periodically.

To upgrade PocketBase, review its release notes, back up, update `version` and
the upstream `checksums.txt`, test migrations locally, and redeploy. Both native
development and Docker use the same version/checksum files.
