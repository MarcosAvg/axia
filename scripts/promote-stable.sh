#!/usr/bin/env bash
set -euo pipefail
case "${1:?Indica el canal de publicación}" in
  stable) ;;
  commit|prerelease) exit 0 ;;
  *) echo 'Canal de publicación inválido.' >&2; exit 1 ;;
esac
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${GITHUB_REPOSITORY:?Falta identificar el repositorio de la release}"
version="$(gh api --paginate "repos/$GITHUB_REPOSITORY/releases?per_page=100" \
  --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name' \
  | node "$ROOT/scripts/release-channel.mjs" latest-stable)"
[[ -n "$version" ]]
bundle="$(mktemp -d)"
trap 'rm -r -- "$bundle"' EXIT
gh release download "$version" --repo "$GITHUB_REPOSITORY" --dir "$bundle" \
  --pattern axia-self-hosted.tar.gz --pattern axia-self-hosted.tar.gz.sha256
(cd "$bundle" && sha256sum -c axia-self-hosted.tar.gz.sha256)
tar -xOzf "$bundle/axia-self-hosted.tar.gz" ./release.json > "$bundle/release.json"
[[ "$(node -p 'require(process.argv[1]).version' "$bundle/release.json")" == "$version" ]]
digest="$(node -p 'require(process.argv[1]).image' "$bundle/release.json")"
repo="ghcr.io/${GITHUB_REPOSITORY,,}/axia-app"
[[ "${digest%@*}" == "$repo" && "${digest##*@}" =~ ^sha256:[a-f0-9]{64}$ ]]
docker buildx imagetools create --prefer-index=false --tag "$repo:latest" "$digest"
gh release edit "$version" --latest --repo "$GITHUB_REPOSITORY"
