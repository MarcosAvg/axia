import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stableTag = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const prereleaseTag =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-[a-z0-9-]+(?:\.[a-z0-9-]+)*$/

export function releaseChannel(refType, ref) {
  if (refType !== 'tag') return 'commit'
  if (stableTag.test(ref)) return 'stable'
  if (prereleaseTag.test(ref)) return 'prerelease'
  throw new Error(`Invalid release tag: ${ref}`)
}

function compareVersions(a, b) {
  return a.localeCompare(b, 'en', { numeric: true })
}

export function latestStable(tags, before) {
  const ceiling = before?.split('-')[0]
  return tags
    .filter((tag) => stableTag.test(tag))
    .filter((tag) => !ceiling || compareVersions(tag, ceiling) < 0)
    .sort((a, b) => compareVersions(b, a))[0]
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, refType, ref] = process.argv.slice(2)
  switch (command) {
    case 'channel':
      console.log(releaseChannel(refType, ref))
      break
    case 'latest-stable':
      console.log(
        latestStable(readFileSync(0, 'utf8').split(/\s+/), refType) ?? '',
      )
      break
    default:
      throw new Error(
        'Usage: release-channel.mjs channel TYPE REF | latest-stable [BEFORE]',
      )
  }
}
