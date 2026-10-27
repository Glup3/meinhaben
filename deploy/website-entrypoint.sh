#!/bin/sh
set -eu

npm run build
exec nginx -g 'daemon off;'
