#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -r -- "$SCRATCH"' EXIT
export PATH="$SCRATCH:$PATH" GITHUB_REPOSITORY=example/axia
export FIXTURE="$SCRATCH/fixture" TRACE="$SCRATCH/docker.trace"
mkdir "$FIXTURE"
digest="ghcr.io/example/axia/axia-app@sha256:$(printf '%064d' 1)"
printf '{"version":"v0.10.0","image":"%s"}\n' "$digest" > "$FIXTURE/release.json"
(
  cd "$FIXTURE"
  tar -czf axia-self-hosted.tar.gz ./release.json
  sha256sum axia-self-hosted.tar.gz > axia-self-hosted.tar.gz.sha256
)
cat > "$SCRATCH/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
case "$1 $2" in
  'api --paginate') printf '%s\n' v0.9.9 v0.10.0 v1.0.0-rc.1 ;;
  'release download')
    [[ "$3" == v0.10.0 && "$6" == --dir ]]
    cp "$FIXTURE"/axia-self-hosted.tar.gz* "$7/"
    ;;
  'release edit') [[ "$3" == v0.10.0 && "$4" == --latest ]] ;;
  *) exit 64 ;;
esac
MOCK
cat > "$SCRATCH/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$TRACE"
MOCK
chmod +x "$SCRATCH/gh" "$SCRATCH/docker"

bash "$ROOT/scripts/promote-stable.sh" prerelease
[[ ! -e "$TRACE" ]]
bash "$ROOT/scripts/promote-stable.sh" stable
grep -Fxq "buildx imagetools create --prefer-index=false --tag ghcr.io/example/axia/axia-app:latest $digest" "$TRACE"
: > "$TRACE"
printf 'corrupt' >> "$FIXTURE/axia-self-hosted.tar.gz"
if bash "$ROOT/scripts/promote-stable.sh" stable >/dev/null 2>&1; then
  echo 'Se intentó promover un paquete corrupto' >&2
  exit 1
fi
[[ ! -s "$TRACE" ]]
echo 'OK: promoción estable, prerelease y paquete inválido'
