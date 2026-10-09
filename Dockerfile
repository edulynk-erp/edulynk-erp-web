# syntax=docker/dockerfile:1

# The base image is unresolved, so there is deliberately no default. Pass a digest-pinned Node 22 slim image, e.g.
# --build-arg NODE_IMAGE=node:22-bookworm-slim@sha256:<digest>. Build for ARM64 with --platform linux/arm64.
# No runtime configuration is baked in: APP_ENV, SESSION_ENCRYPTION_KEY etc. are supplied at run time.
ARG NODE_IMAGE

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY next.config.ts tsconfig.json postcss.config.mjs ./
COPY src ./src
# Production build only (never the e2e build).
RUN test -z "${EDULYNK_E2E_BUILD:-}" && npm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=root:root /app/.next/standalone ./
COPY --from=build --chown=root:root /app/.next/static ./.next/static
# Numeric non-root UID/GID so the image runs without a passwd entry and with a read-only root filesystem.
USER 1000:1000
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "server.js"]
