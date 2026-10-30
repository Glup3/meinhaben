#!/bin/sh
set -eu

export SITE_URL="${SITE_URL:-https://meinhaben.glup3.dev}"
export POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8090}"

pnpm run build

shutdown() {
  trap '' QUIT TERM INT
  kill -QUIT "$nginx_pid"
  wait "$nginx_pid" || true
  # Keep the container's network endpoint alive while Traefik removes it.
  # Connections to the closed port fail immediately, allowing the website's
  # retry middleware to choose the healthy replacement instead of waiting for
  # a TCP timeout against a container IP that has already disappeared.
  sleep 10
  exit 0
}

nginx -g 'daemon off;' &
nginx_pid=$!
trap shutdown QUIT TERM INT
wait "$nginx_pid"
