# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS backend_builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/migration ./migration
COPY backend/db ./db
COPY backend/list-users.js ./list-users.js

RUN npm run build

FROM node:20-alpine AS frontend_builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend_builder /app/backend/dist ./dist
COPY --from=backend_builder /app/backend/migration ./migration
COPY --from=backend_builder /app/backend/db ./db
COPY --from=backend_builder /app/backend/list-users.js ./list-users.js
COPY --from=frontend_builder /app/frontend/dist ./public

RUN mkdir -p uploads/review-photos

EXPOSE 3003
CMD ["node", "dist/server.js"]
