#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -r "$TEST_DIR"' EXIT
mkdir "$TEST_DIR/bin"
export TRACE="$TEST_DIR/trace" PATH="$TEST_DIR/bin:$PATH" AXIA_IMAGE=axia:test
export AXIA_ENV_FILE=/dev/null AXIA_COMPOSE_FILE=compose.test.yaml COMPOSE_PROJECT_NAME=axia_recovery_test
cat > "$TEST_DIR/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$TRACE"
case "$*" in
  'image inspect --format {{.Id}} axia:test') echo sha256:test;;
  *'config --images app'*) printf 'axia:test\naxia:test\npostgres:17.11-alpine\n';;
  *'config --images migrate'*) printf '%s\npostgres:17.11-alpine\n' "${MIGRATE_IMAGE:-axia:test}";;
  *'config --format yaml app'*|*'config --format yaml migrate'*)
    cat <<YAML
services:
  app:
    environment:
      FAKE_PASSWORD: must-not-escape
    image: axia:test
  db:
    image: postgres:17.11-alpine
  migrate:
    image: ${MIGRATE_IMAGE:-axia:test}
networks:
  default:
    name: fixture
YAML
    ;;
  *'ps --status running -q app'*) [[ "${APP_RUNNING:-yes}" == yes ]] && echo app-id; exit 0;;
  *'ps -q db'*) echo db-id;;
  *'com.docker.compose.oneoff=True'*) [[ "${ACTIVE_JOB:-no}" == yes ]] && echo job-id; exit 0;;
  *'ps -aq app'*) echo app-id;;
  *'inspect --format {{.Image}} app-id'*) echo "${APP_IMAGE_ID:-sha256:test}";;
  *'inspect --format {{.State.ExitCode}} app-id'*) echo "${STOP_EXIT:-0}";;
  *'pg_dump '*) [[ "${FAIL_DUMP:-no}" == yes ]] && exit 8; echo dump;;
  *'tar -C /data/evidence -czf - .'*) [[ "${FAIL_EVIDENCE:-no}" == yes ]] && exit 9; echo archive;;
  *'pg_restore '*) cat >/dev/null; [[ "${FAIL_RESTORE:-no}" == yes ]] && exit 7; exit 0;;
  *'psql '* ) echo "${DB_OBJECTS:-0}";;
  *'find /data/evidence'*) [[ "${OLD_EVIDENCE:-no}" == yes ]] && echo old-file; exit 0;;
esac
MOCK
chmod +x "$TEST_DIR/bin/docker"
run_backup() { : > "$TRACE"; BACKUP_DIR="$TEST_DIR/$1" bash "$ROOT/deploy/scripts/backup-all.sh" >"$TEST_DIR/output" 2>&1; }
run_restore() { : > "$TRACE"; bash "$ROOT/deploy/scripts/restore-all.sh" "$1" >"$TEST_DIR/output" 2>&1; }
assert_trace() { grep -Eq -- "$1" "$TRACE" || { cat "$TRACE"; exit 1; }; }
(unset AXIA_IMAGE; run_backup configured) || { cat "$TEST_DIR/output"; exit 1; }
[[ -n "$(find "$TEST_DIR/configured" -name manifest)" ]]
assert_trace 'config --format yaml app'
if grep -Eq -- '--user 0' "$TRACE"; then echo 'La copia usa root aunque la imagen limita capacidades'; exit 1; fi
! grep -Eq 'must-not-escape' "$TEST_DIR/output"
if MIGRATE_IMAGE=axia:other run_backup migrate_mismatch; then echo 'Aceptó migrador distinto'; exit 1; fi
! grep -Eq ' stop app|pg_dump ' "$TRACE"
if ACTIVE_JOB=yes run_backup job; then echo 'Aceptó trabajo activo'; exit 1; fi
! grep -Eq ' stop app|pg_dump ' "$TRACE"
if APP_IMAGE_ID=sha256:other run_backup mismatch; then echo 'Aceptó release diferente'; exit 1; fi
! grep -Eq 'pg_dump ' "$TRACE"
if FAIL_DUMP=yes run_backup dump_failure; then echo 'Aceptó dump fallido'; exit 1; fi
[[ -z "$(find "$TEST_DIR/dump_failure" -name manifest)" ]]
assert_trace 'start app'
run_backup valid
SET="$(find "$TEST_DIR/valid" -name manifest -printf '%h\n')"
[[ -n "$SET" && $(stat -c %a "$SET") == 700 && $(stat -c %a "$SET/database.dump") == 600 ]]
assert_trace 'compose -f compose.test.yaml --env-file /dev/null stop app'
assert_trace 'start app'
stop_line="$(grep -En ' stop app' "$TRACE" | cut -d: -f1)"
dump_line="$(grep -En 'pg_dump ' "$TRACE" | cut -d: -f1)"
start_line="$(grep -En ' start app' "$TRACE" | cut -d: -f1)"
[[ "$stop_line" -lt "$dump_line" && "$dump_line" -lt "$start_line" ]]
if FAIL_EVIDENCE=yes run_backup failed; then echo 'Aceptó fallo de evidencia'; exit 1; fi
[[ -z "$(find "$TEST_DIR/failed" -name manifest)" && -f "$SET/manifest" ]]
assert_trace 'start app'
APP_RUNNING=no run_backup stopped
! grep -Eq 'start app' "$TRACE"
if STOP_EXIT=137 run_backup killed; then echo 'Aceptó cierre forzado'; exit 1; fi
! grep -Eq 'pg_dump ' "$TRACE"
if FAIL_RESTORE=yes run_restore "$SET"; then echo 'Aceptó restore fallido'; exit 1; fi
! grep -Eq 'start app' "$TRACE"
assert_trace --single-transaction
(unset AXIA_IMAGE; run_restore "$SET")
assert_trace 'run --rm --no-deps -T migrate node dist/db/migrate.js'
assert_trace 'tar --no-same-owner -C /data/evidence -xzf -'
! grep -Eq -- '--user 0' "$TRACE"
assert_trace 'start app'
if DB_OBJECTS=3 run_restore "$SET"; then echo 'Aceptó destino con datos'; exit 1; fi
! grep -Eq 'pg_restore ' "$TRACE"
if OLD_EVIDENCE=yes run_restore "$SET"; then echo 'Aceptó evidencia vieja'; exit 1; fi
! grep -Eq 'pg_restore ' "$TRACE"
printf corrupt >> "$SET/database.dump"
if run_restore "$SET"; then echo 'Aceptó checksum corrupto'; exit 1; fi
! grep -Eq 'stop app|pg_restore ' "$TRACE"
echo 'OK: respaldo, fallos, permisos, aislamiento y recuperación transaccional'
