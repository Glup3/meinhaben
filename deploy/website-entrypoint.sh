#!/bin/sh
set -eu

# Coolify injects the current deployment's domains and service names. Resolve
# these at startup, including PR suffixes, before Astro generates static HTML.
export SITE_URL="${SERVICE_URL_WEBSITE:-${SITE_URL:-https://meinhaben.glup3.dev}}"
export POCKETBASE_URL="${SERVICE_URL_POCKETBASE:-${POCKETBASE_URL:-http://127.0.0.1:8090}}"
if [ -n "${SERVICE_NAME_POCKETBASE:-}" ]; then
  export POCKETBASE_INTERNAL_URL="http://${SERVICE_NAME_POCKETBASE}:8090"
fi

pnpm run build
exec nginx -g 'daemon off;'
