#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -r -- "$SCRATCH"' EXIT
export PATH="$SCRATCH:$PATH" TRACE="$SCRATCH/trace" GITHUB_REPOSITORY=example/fork
cat > "$SCRATCH/gh" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$TRACE"
case "$*" in
  'api --paginate repos/example/fork/releases?'*) printf '%s' "${FORK_TAGS:-}" ;;
  'api repos/example/fork --jq '*) echo upstream/axia ;;
  'api --paginate repos/upstream/axia/releases?'*) printf '%s\n' v0.10.0 v0.9.9 ;;
  'release download '*) exit 0 ;;
  *) exit 64 ;;
esac
MOCK
chmod +x "$SCRATCH/gh"

origin="$(bash "$ROOT/scripts/download-upgrade-origin.sh" "$SCRATCH" v0.1.0)"
[[ "$origin" == upstream/axia@v0.10.0 ]]
grep -q 'release download v0.10.0 --repo upstream/axia' "$TRACE"
: > "$TRACE"
origin="$(FORK_TAGS=$'v0.1.0\nv0.2.0' bash "$ROOT/scripts/download-upgrade-origin.sh" "$SCRATCH" v0.2.0)"
[[ "$origin" == example/fork@v0.1.0 ]]
! grep -q upstream "$TRACE"
echo 'OK: origen propio y respaldo de compatibilidad desde el upstream del fork'
