#!/bin/sh
set -eu

: "${PB_ADMIN_EMAIL:?Set PB_ADMIN_EMAIL}"
: "${PB_ADMIN_PASSWORD:?Set PB_ADMIN_PASSWORD}"
: "${PB_ENCRYPTION_KEY:?Set PB_ENCRYPTION_KEY}"

# Apply committed migrations before serving requests. Do not generate migrations
# from production dashboard changes; create those locally and commit them.
/pb/pocketbase migrate up --automigrate=0 --encryptionEnv=PB_ENCRYPTION_KEY

# Coolify environment values are authoritative for this bootstrap superuser.
# A change here takes effect on restart; the password never enters the image.
/pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --automigrate=0 --encryptionEnv=PB_ENCRYPTION_KEY

exec /pb/pocketbase serve --http=0.0.0.0:8090 --automigrate=0 --encryptionEnv=PB_ENCRYPTION_KEY
