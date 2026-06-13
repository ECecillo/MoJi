# syntax=docker/dockerfile:1
#
# Image de déploiement single-origin (cf. RFC 0011, RFC 0013) : un seul conteneur
# sert la PWA (frontend buildé) ET l'API, avec la base SQLite sur un volume.
# Multi-étapes : build front (Node), build Go statique, runtime Alpine minimal.

# 1. Build du frontend → dist/
FROM node:24.15.0-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# `vite build` seul (pas `npm run build` qui enchaîne `tsc --noEmit`) : le
# typecheck strict est la responsabilité de la CI ; l'image se contente de
# produire le bundle. Évite aussi de dépendre de `shared/` (tsc inclut les tests).
RUN npx vite build

# 2. Build du binaire Go (statique : SQLite pur-Go, CGO désactivé)
FROM golang:1.26.2-alpine AS backend
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# 3. Runtime minimal
FROM alpine:3.20
RUN apk add --no-cache wget && adduser -D -u 10001 app
WORKDIR /app
COPY --from=backend /server /app/server
COPY --from=backend /app/backend/migrations /app/migrations
COPY --from=frontend /app/frontend/dist /app/dist
# Répertoire de données (volume), accessible à l'utilisateur non-root.
RUN mkdir -p /data && chown app:app /data
USER app

ENV SINO_HOST=0.0.0.0 \
    SINO_PORT=8787 \
    SINO_STATIC_DIR=/app/dist \
    SINO_MIGRATIONS_DIR=/app/migrations \
    SINO_DB_PATH=/data/sinogrammes.db

EXPOSE 8787
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1

ENTRYPOINT ["/app/server"]
