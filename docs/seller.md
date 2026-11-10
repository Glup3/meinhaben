# Private mobile seller interface

`/verkaufen/` uses the same German design tokens as the marketplace and the Node
SSR runtime from the public marketplace change. No rebuild or deployment webhook
runs when a seller edits content: the public pages read PocketBase on request.

## Backend-first rollout and account bootstrap

1. Back up PocketBase's database **and uploads**. Test the backup and migrations
   on a separate local/staging database first.
2. Deploy the backend image containing `1794300000_sellers.js` and the existing
   validation hooks; let the normal backend entrypoint apply migrations. Verify
   `/api/health`, anonymous published reads, hidden drafts, and the locked seller
   create/update rules. This migration remains compatible with the old website.
3. In the PocketBase superuser dashboard, create a record in the **sellers auth
   collection**. Set a private email/password and `enabled = true`. Give the
   seller those credentials privately. There is no public signup. Do not use a
   superuser account to sign into the website. Do not put credentials in Git,
   frontend variables, build arguments, or the website runtime.
4. Existing listings have an empty `owner`. They remain public when published,
   but cannot be edited by sellers until a superuser assigns the correct seller
   in the dashboard. Do not bulk-assign every listing if multiple sellers exist.
   Categories are still managed by a superuser in the dashboard.
5. Deploy the combined SSR + seller website with runtime `POCKETBASE_URL` (public
   file origin), optional `POCKETBASE_INTERNAL_URL` (server API only), and HTTPS.
   No `PB_ADMIN_*` or other backend credential belongs on the website. Preserve
   the backend resource, persistent volume and encryption key. No production
   deployment or merge is performed by this change.
6. With a test seller, verify login, a private draft, two uploads, retry, preview,
   publish, order/cover, reserved/sold, logout and account disable. Publication
   becomes visible on the next public request. Deploy the backend before the
   website, including when rolling out with Coolify's separate resources.

**Previews:** the existing public SSR previews may read production anonymously.
For seller testing, configure a separate test PocketBase runtime URL with test
accounts and migrations. Do not sign into a preview connected to production:
its authenticated writes would affect production. This implementation and its
integration tests never write production.

To revoke access, set `enabled = false` or change the seller's password in the
backend dashboard. Every protected page/action refreshes the auth token against
PocketBase and requires the `sellers` collection plus `enabled = true`.

## Security boundaries

- The HttpOnly session cookie is scoped to `/verkaufen`, SameSite Strict, Secure
  on HTTPS, and expires after eight hours. PocketBase tokens also expire after
  eight hours; successful authenticated requests refresh the session. Serve the
  deployed website only over HTTPS; plain HTTP is supported for local work.
- The browser never receives the PB auth token in HTML/JSON/React props. The
  server creates each request independently, with no global authenticated SDK.
  Private page and API responses use `no-store`; no private content is prerendered.
- Mutations, including login/logout, require an exact same-origin `Origin`
  header and reject cross-site Fetch Metadata. Missing origins fail closed.
  SameSite cookies provide another CSRF boundary. Reverse proxies must preserve
  the external origin used by Astro; test this after deployment.
- Browser input is allowlisted. The API chooses ownership and a stable unique
  slug when creating a draft; subsequent edits preserve both. PB independently
  limits writes to enabled sellers and their own records, rejects owner/relation
  reassignment, and locks seller record creation/updates/deletes to superusers.
  Sellers cannot grant roles or promote themselves. Public reads remain limited
  to published listings and their photo records; sellers also see their drafts.
- **File semantics are unchanged:** files are ordinary public PocketBase files.
  Anonymous API record reads hide draft photos, but anyone with an exact draft
  file URL can still fetch it. This is metadata privacy, not confidential file
  storage. Do not upload confidential images. Changing to protected files would
  require a separate authorized-delivery design for public marketplace images.
- Existing publication/details validation and transactional last-photo hooks
  remain installed and authoritative, including for direct PB API clients.
  Never remove these hooks to accommodate a failed seller operation.

## Mobile flow and recovery

Add JPEG/PNG/WebP from camera or library. Large supported images are resized to
at most 2000 pixels on their long edge and encoded as JPEG at 85% quality; small
images remain unchanged. Input limit is 40 MB before decoding, server/PB limit
is 10 MB per uploaded image, and the UI allows 30 photos. HEIC/HEIF and other
formats give an explicit conversion message. The first ordered photo is the
cover; arrow buttons provide keyboard/touch reordering as well as removal.

Save requires the backend's basic title, description, category and condition.
Optional structured details use label/value rows. Save text as a draft first,
then upload photos, apply order/removals, and publish only after success. A live
listing stays published when edited; its text changes become visible immediately,
including if a later photo operation needs a retry. Preview is private client
state, and may include changes that have not yet been saved.

Stable IDs prevent duplicate drafts/photos after a successful write whose
response is lost. Partial uploads retain the text, pending files and known
successful uploads in the current editor. Retry in place; an expired session can
be renewed with “Erneut anmelden” without closing the editor. The editor warns
before navigating away with unsaved changes. It deliberately does not persist
private drafts or binary photos in browser local storage; closing/reloading the
tab loses unsaved inputs. Previously persisted text/photos remain in PocketBase.

Photo replacements upload before explicit deletions; an unseen photo added in
another tab is preserved. Reordering uses spare positions to satisfy the unique
index, and can be retried after partial failure. Operations across records are
not a transaction: partial saves may be visible until retry. Concurrent writes
can return a useful failure/retry state; concurrent text editing uses last save
wins. Avoid editing the same listing in multiple tabs. The PB hook prevents
removal of the final published photo; add a replacement first.

## Validation

```sh
pnpm run pb:install
pnpm run test:seller
pnpm test
pnpm run check
pnpm run build
```

`test:seller` starts the pinned PB binary on a free loopback port, applies the
committed migrations/hooks to a fresh temporary directory, creates random local
credentials, exercises actual seller endpoints and PB APIs, and removes the
process/data. It overrides configured backend URLs and never loads `.env`.
Tests cover private drafts, no signup/self-promotion, owner isolation, CSRF,
secure cookie options, account revocation, retries, order, public file semantics,
publication validation, last-photo protection, and logout.
