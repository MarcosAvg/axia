#!/usr/bin/env bash
# Real disposable Compose install, legacy-history upgrade, backup and recovery.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRATCH="$(mktemp -d)"
PREFIX="axia-smoke-$(date +%s)-$RANDOM"
SOURCE_PROJECT="$PREFIX-source"
TARGET_PROJECT="$PREFIX-target"
export AXIA_IMAGE="${AXIA_IMAGE:-axia-app:ci}"
export AXIA_ENV_FILE=/dev/null
export POSTGRES_OWNER_PASSWORD=smoke-owner-password
export AXIA_APP_PASSWORD=smoke-app-password
export POSTGRES_OWNER_USER=axia_owner POSTGRES_DB=axia
export COMPOSE_FILE="$ROOT_DIR/compose.yaml:$SCRATCH/compose.smoke.yaml"
cd "$ROOT_DIR"
cat > "$SCRATCH/compose.smoke.yaml" <<'YAML'
networks:
  proxy:
    external: false
    name: ${COMPOSE_PROJECT_NAME}_proxy
YAML
compose() { docker compose --env-file /dev/null "$@"; }
cleanup() {
  local status=$?
  trap - EXIT
  for project in "$SOURCE_PROJECT" "$TARGET_PROJECT"; do
    COMPOSE_PROJECT_NAME="$project" compose down -v --remove-orphans >/dev/null 2>&1 || true
  done
  rm -r -- "$SCRATCH"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export COMPOSE_PROJECT_NAME="$SOURCE_PROJECT"
compose up -d --wait
compose exec -T app node -e '
  const response = await fetch("http://127.0.0.1:3100/api/setup", {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({username:"smoke.admin", fullName:"Smoke Admin", password:"SmokePassword123!"})
  }); if (!response.ok) throw new Error(`First-run failed: ${response.status}`)
'
compose exec -T app node -e '
  const fs = require("node:fs");
  fs.mkdirSync("/data/evidence/files", {recursive:true});
  fs.writeFileSync("/data/evidence/files/smoke-probe.txt", "evidence-witness");
'
# This change only adds runner metadata: recreate the actual pre-checksum
# history and upgrade it with the new runner, preserving real first-run data.
compose stop app
compose exec -T db psql -U axia_owner -d axia -v ON_ERROR_STOP=1 -c "delete from axia_migrations.schema_migrations where name='0016_migration_history.sql'; alter table axia_migrations.schema_migrations drop column checksum;" >/dev/null
compose run --rm --no-deps -T migrate
compose up -d --wait app
BACKUP_DIR="$SCRATCH/backups" bash deploy/scripts/backup-all.sh
BACKUP_SET="$(find "$SCRATCH/backups" -name manifest -printf '%h\n')"
[[ -n "$BACKUP_SET" ]]
export COMPOSE_PROJECT_NAME="$TARGET_PROJECT"
bash deploy/scripts/restore-all.sh "$BACKUP_SET"
compose up -d --wait app
USERS="$(compose exec -T db psql -U axia_owner -d axia -At -c "select count(*) from users where username='smoke.admin';")"
[[ "$USERS" == 1 ]]
compose exec -T app node -e '
  const fs = await import("node:fs");
  if (fs.readFileSync("/data/evidence/files/smoke-probe.txt", "utf8") !== "evidence-witness") throw new Error("Evidence mismatch");
  const response = await fetch("http://127.0.0.1:3100/api/auth/login", {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({username:"smoke.admin",password:"SmokePassword123!"})
  }); if (!response.ok) throw new Error(`Restored login failed: ${response.status}`)
'
BEFORE="$(compose exec -T db psql -U axia_owner -d axia -At -c 'select count(*) from axia_migrations.schema_migrations;')"
compose run --rm --no-deps -T migrate
AFTER="$(compose exec -T db psql -U axia_owner -d axia -At -c 'select count(*) from axia_migrations.schema_migrations;')"
[[ "$BEFORE" == "$AFTER" && "$AFTER" == 17 ]]
# Restoring over a populated instance must fail before replacing its data.
if bash deploy/scripts/restore-all.sh "$BACKUP_SET" > "$SCRATCH/rejected-restore.log" 2>&1; then
  echo 'Restore unexpectedly accepted a populated destination' >&2
  exit 1
fi
[[ "$(compose exec -T db psql -U axia_owner -d axia -At -c "select count(*) from users where username='smoke.admin';")" == 1 ]]
echo 'Docker smoke OK: empty install, legacy-history upgrade, consistent backup, empty-host recovery, login and evidence, populated-target rejection.'
