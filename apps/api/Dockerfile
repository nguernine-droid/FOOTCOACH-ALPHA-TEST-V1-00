# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace apps/api --workspace packages/shared

FROM deps AS dev
COPY packages/shared packages/shared
COPY apps/api apps/api
EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace", "apps/api"]

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "apps/api"]
