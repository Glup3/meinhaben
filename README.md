# meinhaben

An empty, static Astro project with `astro-loader-pocketbase` and a self-hosted
PocketBase service. No application collections or sample content are created.

## Local development

Requires Node >=22.23.4 (Node 24 recommended), npm, and `unzip` on Linux/macOS.

```sh
npm ci
cp .env.example .env
npm run pb:install
npm run pb:dev
```

In another terminal, run `npm run dev`. Astro is at `http://localhost:4321` and
PocketBase is at `http://127.0.0.1:8090/_/`. Follow the first-run installer link
printed by PocketBase to create a local superuser. Local data and downloaded
binaries are ignored by Git. The installer verifies the pinned SHA-256 checksum.

Alternatively, run `docker compose -f compose.local.yaml up --build` for local
PocketBase. This binds only to localhost and writes data, migrations and hooks
into the same local directories as the native CLI.

```sh
npm run check
npm run build
npm run preview
```

## Content loading

`src/content.config.ts` includes a commented loader example. Create your own
PocketBase collection, give it suitable API rules, then enable and adapt that
example. An explicit Astro schema avoids needing superuser credentials in the
frontend build. Only publish fields intended for visitors; a public list/view
rule exposes records directly through the PocketBase API too.

`POCKETBASE_URL` selects the backend URL at **build time**. The deployed build
uses `https://meinhaben-admin.ditto.glup3.dev`; local development uses `.env`.
PocketBase content changes need a new Astro build/deployment. There is no
automatic content-change rebuild webhook in this starter. Once collections are
enabled, PocketBase must be reachable when Astro builds.

## Schema migrations and hooks

- `pocketbase/pb_migrations/`: committed JavaScript migrations.
- `pocketbase/pb_hooks/`: committed PocketBase JavaScript hooks.
- `pocketbase/pb_data/`: local SQLite databases, uploads and backups; never commit.
- `pocketbase/version` and `pocketbase/checksums.txt`: pinned PocketBase release.

While `npm run pb:dev` is running, schema changes in the local dashboard generate
migration files automatically. Review and commit those files alongside code.
Create a custom data migration with:

```sh
npm run pb -- migrate create your_migration_name
npm run pb -- migrate up
```

Production runs `migrate up` before serving and disables automatic generation.
Only pending migrations run; the applied history lives in the persistent database.
Make production schema changes through committed migrations rather than editing
the production dashboard. Hooks ship in the image and take effect on redeploy.
Export a schema if needed with `npm run pb -- migrate collections`.

Back up before schema changes. Rolling back an application image does **not**
reverse migrations. If a reviewed migration has a safe down function, stop the
service and run `pocketbase migrate down N` against the same data with the same
PocketBase version and encryption environment; otherwise restore a backup.
Never run multiple PocketBase processes against the same SQLite data directory.

## Coolify deployment

Public source: <https://github.com/Glup3/meinhaben>, branch `main`.
Deploy the root `docker-compose.yaml` using Coolify's **Docker Compose** build
pack on `ditto-cloud-1`. Both services build from this repository:

- `website`: Astro builds to HTML, served by Nginx on port 80 at
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
edits still require a manual deployment; they do not trigger the GitHub webhook.
The initial Astro site deliberately renders a blank page. Verify PocketBase with
`curl --fail https://meinhaben-admin.ditto.glup3.dev/api/health`.

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
