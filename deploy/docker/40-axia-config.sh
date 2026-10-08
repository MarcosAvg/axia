#!/bin/sh
# Genera /config.js con la configuración de runtime a partir del entorno del contenedor.
# Lo ejecuta el entrypoint de nginx (scripts en /docker-entrypoint.d/) al arrancar.
set -eu

: "${SUPABASE_URL:?Define SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?Define SUPABASE_ANON_KEY}"

cat >/usr/share/nginx/html/config.js <<EOF
window.__AXIA_CONFIG__ = {
  supabaseUrl: "${SUPABASE_URL}",
  supabaseAnonKey: "${SUPABASE_ANON_KEY}",
}
EOF

echo "config.js generado para ${SUPABASE_URL}"
