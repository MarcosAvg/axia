import assert from 'node:assert/strict'
import test from 'node:test'

import { latestStable, releaseChannel } from './release-channel.mjs'

test('classifies stable tags, prereleases and manual builds', () => {
  assert.equal(releaseChannel('tag', 'v0.32.0'), 'stable')
  assert.equal(releaseChannel('tag', 'v0.32.0-rc.1'), 'prerelease')
  assert.equal(releaseChannel('branch', 'main'), 'commit')
  assert.throws(() => releaseChannel('tag', 'v0.32'), /Invalid release tag/)
})

test('only the highest stable release can take the stable channel', () => {
  const published = ['v0.10.0', 'v0.9.9', 'v1.0.0-rc.1']
  assert.equal(latestStable(published), 'v0.10.0')
  assert.equal(latestStable(['v1.0.0-rc.1', 'nightly']), undefined)
})

test('tests an upgrade from the newest version older than the target', () => {
  const published = ['v0.9.9', 'v0.10.0', 'v0.11.0', 'v1.0.0']
  assert.equal(latestStable(published, 'v0.11.0'), 'v0.10.0')
  assert.equal(latestStable(published, 'v0.11.0-rc.1'), 'v0.10.0')
})
