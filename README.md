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
- `src/styles/global.css` and `src/styles/marketplace.css`: responsive marketplace styling.

The interface follows willhaben’s marketplace with an original MEINHABEN
speech-bubble logo, locally hosted Open Sans, linked vertical cards beneath the featured carousel. The homepage has a three-slide featured carousel
with arrows, automatic switching that pauses on hover or focus, and reduced-motion support.
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

Public source: <https://github.com/Glup3/meinhaben>, branch `main`.
Deploy the root `docker-compose.yaml` using Coolify's **Docker Compose** build
pack on `ditto-cloud-1`. Both services build from this repository:

- `website`: after PocketBase is healthy, Astro generates HTML on container
  startup, served by Nginx on port 80 at
  <https://meinhaben.ditto.glup3.dev>.
- `pocketbase`: checksum-verified PocketBase on port 8090, with API and dashboard
  at <https://meinhaben-admin.ditto.glup3.dev/_/>.

Coolify terminates HTTPS and routes the domains to the respective service ports.
The Compose file exposes no host ports. Its `pocketbase_data` named volume mounts
at `/pb/pb_data`, preserving SQLite, uploads and local backups across redeploys.
Keep the same Coolify resource/volume; deleting its volume deletes the data.

Set these **runtime** environment variables in Coolify before deploying:

```text
PB_ADMIN_EMAIL=<superuser email>
PB_ADMIN_PASSWORD=<strong generated password>
PB_ENCRYPTION_KEY=<32-character random key>
```

Generate an encryption key with `openssl rand -hex 16`. Keep it in your password
manager as well as Coolify: it encrypts stored PocketBase settings and is needed
when restoring them. Do not rotate it without following PocketBase's settings
decryption/re-encryption procedure. Do not commit real environment files.

The entrypoint applies migrations, creates/updates the bootstrap superuser from
these environment values, and starts PocketBase. That user's password is reset
to the configured value on restart; change it in Coolify, then restart to rotate
it. Retrieve the initial credentials in Coolify's environment panel. Frontend
builds do not need these secrets.

Pushes to `main` automatically deploy both services through a signed GitHub
push webhook to Coolify. Other branches do not deploy this production resource.
The webhook secret is stored in GitHub and Coolify, never in this repository.
You can also use **Deploy** in Coolify to rebuild manually. PocketBase content
edits still require a website restart or deployment; they do not trigger the GitHub webhook.
Verify PocketBase with
`curl --fail https://meinhaben-admin.ditto.glup3.dev/api/health`.

### First deployment with the content collections

Deploy the Compose resource normally. Both images build without database API
requests. PocketBase applies migrations and seed data before its health check
passes; Compose then starts the website, which generates pages from that live
database before starting Nginx. A failed content build exits without serving
partial output. This works for both an empty database and an existing deployment
without the new collections, with no manual backend-first rollout. Keep the
existing persistent volume; no throwaway seed database is used for page builds.

### Pull-request preview environments

The same Coolify application supports automatic Docker Compose previews for
repository members' pull requests. Enable **Preview Deployments**, keep public
fork deployments disabled, and subscribe the signed GitHub repository webhook
to both `push` and `pull_request` events. Use the preview URL template
`{{pr_id}}.{{domain}}` and wildcard DNS pointing to `ditto-cloud-1` for both
production domains. Coolify provisions HTTPS for the resulting preview domains.
For PR 42, these are `https://42.meinhaben.ditto.glup3.dev` and
`https://42.meinhaben-admin.ditto.glup3.dev`.

Set `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, and `PB_ENCRYPTION_KEY` separately
under **Preview Deployment Environment Variables**, using preview-only values.
These values are shared across this application's previews, separate from
production. Retrieve credentials in Coolify; never commit them or expose them
in PR comments. The current setup uses the signed repository webhook, so it
does not post automatic GitHub App preview comments.

On container startup, `deploy/website-entrypoint.sh` uses Coolify's generated
`SERVICE_URL_WEBSITE` for the Astro site origin, `SERVICE_URL_POCKETBASE` for
public image URLs, and `SERVICE_NAME_POCKETBASE` for the internal API hostname.
The last value includes Coolify's PR suffix, so builds read their own backend.
Outside Coolify, the configured `SITE_URL`, `POCKETBASE_URL`, and
`POCKETBASE_INTERNAL_URL` still work; export `SITE_URL` before standalone builds.

Each preview has its own containers, network, and generated named
`pocketbase_data` volume. Its first deployment applies the PR's migrations and
loads the sample listings; production content is not copied. Updating the PR
retains that preview's database and applies pending migrations. Containers
share the deployment server's resources.

Closing or merging the PR deletes the preview and its Coolify-generated named
volumes and network. Stopping a preview is not the same as deleting it. Do not
give this volume a fixed `name`, mark it `external`, or replace it with a shared
host bind mount: those storage types are excluded from generated-volume cleanup
and can break data isolation. Cleanup can fail if the server is unreachable or
a volume remains in use; check the server after a failed cleanup. Reopening a
deleted preview starts again with fresh sample data.

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
