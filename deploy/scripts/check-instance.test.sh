#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -r -- "$SCRATCH"' EXIT
mkdir "$SCRATCH/bin" "$SCRATCH/backup" "$SCRATCH/backup/axia-sample"
export PATH="$SCRATCH/bin:$PATH" BACKUP_DIR="$SCRATCH/backup"
export AXIA_PUBLIC_URL=https://axia.invalid AXIA_ENV_FILE=/dev/null
cat > "$SCRATCH/bin/docker" <<'MOCK'
#!/usr/bin/env bash
case "$*" in
  *'exec -T app node'*) [[ "${FAIL_READY:-0}" != 1 ]];;
  *'exec -T app sh'*) [[ "${FAIL_STORAGE:-0}" != 1 ]];;
  *'exec -T db sh'*) exit 0;;
  *) exit 64;;
esac
MOCK
cat > "$SCRATCH/bin/curl" <<'MOCK'
#!/usr/bin/env bash
[[ "${FAIL_HTTPS:-0}" != 1 ]] || exit 1
printf '%s' "${HTTP_STATUS:-200}"
MOCK
chmod +x "$SCRATCH/bin/"*

manifest="$BACKUP_DIR/axia-sample/manifest"
digest="$(printf '%064d' 1)"
write_manifest() {
  cat > "$manifest" <<EOF
format=2
created_at=$1
image=ghcr.io/example/axia:latest
image_id=sha256:$digest
image_digest=ghcr.io/example/axia@sha256:$digest
database_sha256=$digest
evidence_sha256=$digest
EOF
}
write_manifest "$(date -u +%Y%m%dT%H%M%SZ)"
printf dump > "$BACKUP_DIR/axia-sample/database.dump"
printf evidence > "$BACKUP_DIR/axia-sample/evidence.tgz"

check() { bash "$ROOT/check-instance.sh" > "$SCRATCH/output" 2>&1; }
expect_failure() {
  if check; then echo "Se esperaba fallo de $1" >&2; exit 1; fi
  grep -Fq "ERROR [$1]" "$SCRATCH/output"
}
check || { cat "$SCRATCH/output"; exit 1; }
FAIL_HTTPS=1 expect_failure HTTPS
HTTP_STATUS=302 expect_failure HTTPS
FAIL_READY=1 expect_failure PostgreSQL
FAIL_STORAGE=1 expect_failure Evidencias
sed -i '/^image_digest=/d' "$manifest"
expect_failure Respaldo
write_manifest 20200101T000000Z
expect_failure Respaldo
echo 'OK: diagnóstico de HTTPS, PostgreSQL, evidencias y respaldo reciente'
