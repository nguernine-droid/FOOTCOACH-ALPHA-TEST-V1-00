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
# Le dossier des photos de profil doit exister ET appartenir à l'utilisateur non
# privilégié AVANT le changement d'utilisateur. Sans cela, `mkdir /app/uploads`
# au démarrage de l'API (index.ts) échoue en EACCES — /app appartient à root —
# et comme c'est un `await` de premier niveau, hors du try qui entoure listen(),
# le conteneur s'arrête au lieu de servir.
#
# Le créer ici rend aussi le service démarrable SANS volume monté, et donne la
# bonne appartenance au volume nommé quand il l'est : Docker recopie les
# permissions du point de montage de l'image.
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "apps/api"]
