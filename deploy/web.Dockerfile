# syntax=docker/dockerfile:1
# Imagen del frontend de Axia: construye el SPA y lo sirve con nginx.
# La configuración de Supabase se inyecta en **runtime** al arrancar el contenedor
# (`config.js`), así que la misma imagen sirve para cualquier instalación.

FROM node:lts-slim AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @axia/web build

FROM nginx:alpine AS serve
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker/40-axia-config.sh /docker-entrypoint.d/40-axia-config.sh
RUN chmod +x /docker-entrypoint.d/40-axia-config.sh
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
