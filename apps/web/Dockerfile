# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace apps/web --workspace packages/shared

FROM deps AS dev
COPY packages/shared packages/shared
COPY apps/web apps/web
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "apps/web"]

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
# Les rewrites Next sont figés au build en mode standalone : l'URL interne de
# l'API doit être fournie ici (le DNS Docker résout "api" vers les réplicas).
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace apps/web

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
