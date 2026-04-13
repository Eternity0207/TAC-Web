# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY migration ./migration
COPY db ./db
COPY list-users.js ./list-users.js

RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migration ./migration
COPY --from=builder /app/db ./db
COPY --from=builder /app/list-users.js ./list-users.js

RUN mkdir -p uploads/review-photos

EXPOSE 3003
CMD ["node", "dist/server.js"]
