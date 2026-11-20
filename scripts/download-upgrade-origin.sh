#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
destination="${1:?Indica un directorio de descarga}"
target_version="${2:-}"
: "${GITHUB_REPOSITORY:?Falta identificar el repositorio de la candidata}"

latest_stable() {
  gh api --paginate "repos/$1/releases?per_page=100" \
    --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name' \
    | node "$ROOT/scripts/release-channel.mjs" latest-stable "${2:-}"
}

origin_repo="$GITHUB_REPOSITORY"
origin="$(latest_stable "$origin_repo" "$target_version")"
if [[ -z "$origin" ]]; then
  upstream="$(gh api "repos/$origin_repo" --jq '.source.full_name // .parent.full_name // empty')"
  if [[ -n "$upstream" ]]; then
    # El fork puede tener su propia numeración. El smoke comprueba compatibilidad real.
    origin_repo="$upstream"
    origin="$(latest_stable "$origin_repo")"
  fi
fi
[[ -n "$origin" ]] || { echo 'Falta una release estable de origen para comprobar la actualización.' >&2; exit 1; }
gh release download "$origin" --repo "$origin_repo" --dir "$destination" \
  --pattern axia-self-hosted.tar.gz --pattern axia-self-hosted.tar.gz.sha256 >&2
printf '%s@%s\n' "$origin_repo" "$origin"
