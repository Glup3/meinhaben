FROM alpine:3.23
RUN apk add --no-cache ca-certificates unzip wget
WORKDIR /pb
COPY pocketbase/version pocketbase/checksums.txt ./
RUN set -eu; \
    version="$(cat version)"; \
    case "$(uname -m)" in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; *) echo 'Unsupported CPU architecture'; exit 1 ;; esac; \
    archive="pocketbase_${version}_linux_${arch}.zip"; \
    wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${version}/${archive}"; \
    grep " ${archive}$" checksums.txt | sha256sum -c -; \
    unzip "$archive" pocketbase; \
    rm "$archive"; \
    chmod +x pocketbase
COPY pocketbase/pb_migrations ./pb_migrations
COPY pocketbase/pb_hooks ./pb_hooks
COPY public/images ./seed_images
ENV PB_SEED_IMAGES_DIR=/pb/seed_images
COPY pocketbase/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["/pb/entrypoint.sh"]
