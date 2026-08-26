# The portal, built once and served by Next's standalone server.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm gives up after two retries by default, which is not enough on a link that
# drops TLS handshakes. Widen its own backoff, then wrap the whole install so a
# failure part-way through a few hundred packages costs a retry, not the build.
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && for attempt in 1 2 3; do \
      npm ci && exit 0; \
      echo "npm ci failed (attempt $attempt of 3), retrying"; \
      sleep $((attempt * 10)); \
    done; \
    echo "npm ci failed three times — check egress to registry.npmjs.org" >&2; \
    exit 1

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NODE_ENV=production here is what drops 'unsafe-eval' from the CSP: React only
# needs it for development debugging, and a live page must not have it.
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# Runs as an unprivileged user; the image carries no package manager or shell
# tooling beyond what Alpine's node image needs to start the server.
USER node
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
