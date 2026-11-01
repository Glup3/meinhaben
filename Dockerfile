FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG SITE_URL=https://meinhaben.glup3.dev
ARG POCKETBASE_URL=https://meinhaben-admin.ditto.glup3.dev
ARG POCKETBASE_INTERNAL_URL
# Change this value for content-only rebuilds when Docker caching is enabled.
ARG CONTENT_VERSION
RUN pnpm run build

FROM nginx:alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Keep the previous website running until the replacement serves HTTP.
HEALTHCHECK --interval=5s --timeout=5s --start-period=60s --retries=12 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
# The official image runs Nginx in the foreground and uses SIGQUIT for shutdown.
