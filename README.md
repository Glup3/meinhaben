# meinhaben

A static Astro marketplace for sharing used goods with friends and family.
The German UI loads listings, categories and photo galleries from PocketBase at
build time. Migrations seed the original ten example listings and their photos.

## UI development

Follow the local development setup below, then run `pnpm run dev` to preview the
UI at `http://localhost:4321`. PocketBase must be running for content sync,
`pnpm run check` and `pnpm run build`; there is no static-data fallback.

- `src/content.config.ts`: public PocketBase loaders with explicit content schemas.
- `src/data/listings.ts`: maps PocketBase records into the UI model, including
  category names, German condition labels, cents, paragraphs and ordered photos.
- `src/pages/index.astro`: homepage with featured carousel, vertical links, and selected listings.
- `src/pages/anzeigen.astro`: live search, category and availability filters, price
  sorting, and empty states. Filters are preserved in the URL.
- `src/pages/inserat/[slug].astro`: prebuilt listing pages with accessible photo
  dialogs, item details, related listings, and the WhatsApp contact message.
- `src/components/react/`: hydrated React islands for the featured carousel and
  photo gallery. Astro renders their initial HTML; React owns interactive state.
- `src/styles/global.css`: Tailwind CSS v4 entry point and CSS theme (brand colors,
  Open Sans, 4px spacing, and shared radius).

Tailwind runs through `@tailwindcss/vite` in `astro.config.mjs`, following
[Astro’s Tailwind 4 setup](https://docs.astro.build/en/guides/styling/#add-tailwind-4).
Keep component styling in Astro markup with Tailwind utilities and responsive
variants. Use data attributes and ARIA attributes for JavaScript hooks and
interactive states. Global CSS contains the theme, base reset, and accessibility
defaults. The
spacing token uses pixels to preserve the design with the 14px root font size;
use explicit pixel font sizes when matching existing typography. Tailwind’s theme
and utilities are imported separately, keeping the existing base reset instead
of Preflight so native controls, dialogs, and image sizing retain their appearance.

The interface follows willhaben’s marketplace with an original MEINHABEN
speech-bubble logo, locally hosted Open Sans, linked vertical cards beneath the featured carousel. The homepage has a three-slide featured carousel
with arrows, keyboard navigation, and reduced-motion support.
Immobilien, Auto & Motor, and Jobs link to individual humorous pages;
these verticals contain no sale listings.

The visible search bars have been removed. The Marktplatz card and “Alle Anzeigen”
open `/anzeigen/`, which retains category, availability, budget and condition
filters, sorting, and list/grid views. Previously shared search and homepage
filter URLs still work, with their query state intact. Reset clears all filters.
Listing pages support native sharing with clipboard and visible link fallbacks.

The contact dialog links to the seller's WhatsApp username `glup3` through
`https://wa.me/glup3` and provides a listing-specific message to copy into the chat.
Reserved items allow enquiries; sold items disable the contact button.

Small marketplace jokes appear while listing photos take longer than 600 ms to
load and on the 404 page. Paid, unsold listings also have a “Was letzte Preis?”
button that reveals the asking price with a wink, without changing it or sending
a message. Free and sold listings omit the button.

Sample photos are downloaded from Unsplash into `public/images`; the chair detail
is a crop of the same source photo. The images correspond to the photo IDs used
in the approved mockups and additional sample items. They are illustrative and
must be replaced with actual item photos and descriptions before sharing.
Open Sans is hosted locally under the SIL Open Font License in
`public/fonts/OpenSans-OFL.txt`. The original Inter asset and license are retained.
Search-engine indexing is disabled through page metadata; this is not access
control or authentication.

Link previews are rendered into the static HTML with Open Graph and Twitter
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

`src/content.config.ts` loads `categories`, published `listings`, and their
`listing_images` through public read APIs. Explicit Astro schemas avoid needing
superuser credentials in the frontend build. All records are fetched on each
sync; removed or unpublished entries are removed from Astro's content store.
Run `s` followed by Enter in the Astro dev terminal to sync dashboard edits.
Only publish fields intended for visitors: public API rules expose those records
directly, not just through the website. Missing categories/photos fail the build
with the affected listing's slug instead of silently using static examples.

`POCKETBASE_URL` selects the backend URL at **build time**. The deployed build
uses `https://meinhaben-admin.ditto.glup3.dev`; local development uses `.env`.
PocketBase content changes need a new Astro build/deployment. There is no
automatic content-change rebuild webhook in this starter. PocketBase must be
reachable when Astro builds.

In Docker Compose, page generation runs when the website container starts,
after PocketBase is healthy and has applied its migrations. The server-only
`POCKETBASE_INTERNAL_URL=http://pocketbase:8090` is used for API reads;
`POCKETBASE_URL` remains the public origin for browser image URLs and previews.
Restarting the website container also regenerates its static pages from the
current database. Image builds themselves do not contact PocketBase.

## Editing marketplace content

- `categories`: name, unique slug, existing icon key (`home`, `tech`, `sun`),
  and numeric filter order.
- `listings`: unique slug, title, subtitle, plain-text description (blank lines
  separate paragraphs), category, integer `price_cents`, negotiable flag,
  condition, availability status, handover, JSON details, publication flag/date.
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
Details use `[{"label":"Marke","value":"Patagonia"}]`; handover is a separate
field and is appended to the displayed details. Keep published slugs stable to
avoid breaking shared links. Deleting a listing deletes its photo records too.

All create/update/delete API rules are locked to superusers. Public list/view
rules hide draft listings and their photo records. Uploaded files are ordinary
public files: knowing a draft photo URL still permits access. Use protected files
and authorized delivery if draft images must be confidential.

The one-time seed migration imports 3 categories, 10 listings and 12 actual
uploads from the repository's `public/images` directory; no remote photo download
is needed. Docker copies these into `/pb/seed_images`; `PB_SEED_IMAGES_DIR` can
override the seed source directory. Subsequent restarts/migrations do not reset
edits or recreate deleted examples. These are illustrative examples, not real
inventory. The seed rollback intentionally refuses to delete possibly edited
content; use a backup or remove example records manually instead.

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
| `meinhaben website` | Dockerfile, `/Dockerfile`, port 80 | Rolling website deployments at <https://meinhaben.glup3.dev> |
| `meinhaben PocketBase` | Docker Compose, `/docker-compose.production.yaml` | Existing database and uploads at <https://meinhaben-admin.ditto.glup3.dev> |

### Website

Set runtime `SITE_URL=https://meinhaben.glup3.dev` and
`POCKETBASE_URL=https://meinhaben-admin.ditto.glup3.dev`. The website reads the
public PocketBase API during startup; it needs no database credentials or
persistent storage. Leave `POCKETBASE_INTERNAL_URL` unset for this independent
resource. Nginx starts only after Astro successfully generates the complete
site. A failed build cannot serve a partial site.

Enable the HTTP readiness check on `/`, port 80, with a 60-second start period,
5-second interval/timeout and 12 retries. Keep timestamped container names and
no host port mappings so Coolify can run old and new containers together. Allow
30 seconds for graceful shutdown; the Dockerfile uses Nginx's `SIGQUIT` signal.
Coolify waits for the replacement to become healthy before retiring the old
website. Restarting/deploying the website rebuilds pages from current content.
Content edits do not automatically trigger a deployment.

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
Existing content is not reset by the seed migrations.

Backend auto-deployment is disabled deliberately. After reviewing and backing up
changes to `pocketbase/**` or `docker-compose.production.yaml`, deploy PocketBase
first, verify its health and migrations, then deploy the website. This explicit
ordering prevents a frontend build from racing a schema migration. Backend
updates still have a short interruption; routine website deployments do not
restart PocketBase. Keep migrations compatible with the old website during
rollout. Verify health at `/api/health`.

### Pull-request preview environments

`meinhaben previews` is a separate, preview-only Coolify application using the
full `/docker-compose.yaml`. Its production auto-deployment is disabled; do not
manually deploy its main environment. Enable member-only Preview Deployments,
keep public fork deployments disabled, and use `{{pr_id}}.{{domain}}` with the
same website/backend base domains. Wildcard DNS and the signed repository
webhook (`push` and `pull_request` events) provide URLs such as
`https://42.meinhaben.glup3.dev` and
`https://42.meinhaben-admin.ditto.glup3.dev`.

The preview resource has preview-only `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`,
and `PB_ENCRYPTION_KEY` values; it never receives production credentials or
storage. Each PR gets its own generated volume, network and seeded database.
Updating a PR retains that preview's data. Closing it removes its containers,
network and generated volumes. Never make preview storage external or assign a
fixed shared volume name. Preview deployments may briefly interrupt their own
preview environment; production rolling updates are independent.

`deploy/website-entrypoint.sh` uses Coolify's `SERVICE_URL_WEBSITE`,
`SERVICE_URL_POCKETBASE`, and `SERVICE_NAME_POCKETBASE` in Compose previews so
site URLs, uploaded image URLs, and content reads stay scoped to that PR.
`.github/workflows/preview-link.yml` maintains the preview link in PR descriptions
without checking out or executing PR code. The link does not report readiness.

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
