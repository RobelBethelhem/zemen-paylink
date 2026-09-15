# Build the API as a static binary and ship it on a base with nothing else on
# it — no shell, no package manager, nothing for a foothold to work with.

FROM golang:1.25-alpine AS build
WORKDIR /src

# Dependencies first, so a code change does not re-download the module cache.
COPY go.mod go.sum ./
# On a link that drops TLS handshakes under load, one attempt is not enough:
# a single dropped connection would otherwise fail the build after minutes of
# downloading. Retry with a widening gap, then give up loudly.
RUN for attempt in 1 2 3 4 5; do \
      go mod download && exit 0; \
      echo "go mod download failed (attempt $attempt of 5), retrying"; \
      sleep $((attempt * 5)); \
    done; \
    echo "go mod download failed five times — check egress to proxy.golang.org" >&2; \
    exit 1

COPY . .
# CGO off keeps it static: the MySQL driver is pure Go, so nothing links against
# libc and the binary runs on a base image that has none.
RUN CGO_ENABLED=0 GOOS=linux go build \
      -trimpath -ldflags="-s -w" \
      -o /out/paylink ./cmd/server

# The administration tool ships alongside the server so it runs inside the
# container that already has the database and the encryption key configured.
# There is no shell on the runtime image to fetch it with later.
RUN CGO_ENABLED=0 GOOS=linux go build \
      -trimpath -ldflags="-s -w" \
      -o /out/paylinkadm ./cmd/paylinkadm

# distroless/static carries CA certificates, which the gateway calls need, and
# runs as a non-root user by default.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/paylink /paylink
COPY --from=build /out/paylinkadm /paylinkadm
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/paylink"]
