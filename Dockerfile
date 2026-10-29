FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache nginx && mkdir -p /run/nginx
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY --chmod=755 deploy/website-entrypoint.sh /usr/local/bin/website-entrypoint
EXPOSE 80
# Nginx only starts once Astro has generated the complete site. Coolify keeps
# the previous website running until this readiness check succeeds.
HEALTHCHECK --interval=5s --timeout=5s --start-period=60s --retries=12 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/usr/local/bin/website-entrypoint"]
