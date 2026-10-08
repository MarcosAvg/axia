# syntax=docker/dockerfile:1
# Imagen de migraciones: aplica `supabase/migrations` a la base destino (DATABASE_URL).
# Se ejecuta de un solo uso: `docker compose run --rm migrate`.

FROM node:lts-slim
RUN npm install -g supabase@2.120.0
WORKDIR /app
COPY supabase ./supabase
ENTRYPOINT ["sh", "-c"]
CMD [": \"${DATABASE_URL:?Define DATABASE_URL}\" && supabase db push --db-url \"$DATABASE_URL\" --include-all --yes"]
