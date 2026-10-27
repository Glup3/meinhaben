FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache nginx && mkdir -p /run/nginx
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY --chmod=755 deploy/website-entrypoint.sh /usr/local/bin/website-entrypoint
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
ENTRYPOINT ["/usr/local/bin/website-entrypoint"]
