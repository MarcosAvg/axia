import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const revision = 'a'.repeat(40)
const image = `ghcr.io/marcosavg/axia/axia-app@sha256:${'b'.repeat(64)}`

test('release package contains only runtime files and immutable identity, never private env', () => {
  const root = mkdtempSync(join(tmpdir(), 'axia-package-test-'))
  const output = join(root, 'bundle')
  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/package-release.mjs', output, image, revision, 'v0.1.0'],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 0, result.stderr)
    const env = readFileSync(join(output, '.env.example'), 'utf8')
    assert.ok(env.includes(`# AXIA_IMAGE=${image}`))
    assert.ok(env.includes(':latest'))
    const release = JSON.parse(
      readFileSync(join(output, 'release.json'), 'utf8'),
    )
    assert.equal(release.revision, revision)
    assert.equal(release.image, image)
    assert.ok(existsSync(join(output, 'deploy/scripts/compose-operations.sh')))
    assert.ok(existsSync(join(output, 'OPERATIONS.md')))
    assert.ok(!existsSync(join(output, '.env')))
    assert.ok(!existsSync(join(output, 'package.json')))
    assert.ok(!existsSync(join(output, 'apps')))
    assert.ok(
      readdirSync(join(output, 'deploy/scripts')).every(
        (name) => !name.includes('.test.'),
      ),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('operator links use the repository from GITHUB_REPOSITORY', () => {
  const root = mkdtempSync(join(tmpdir(), 'axia-package-test-'))
  const output = join(root, 'bundle')
  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/package-release.mjs', output, image, revision, 'v0.1.0'],
      {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_REPOSITORY: 'example/axia' },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    const readme = readFileSync(join(output, 'README.md'), 'utf8')
    assert.ok(
      readme.includes(`https://github.com/example/axia/blob/${revision}/`),
      readme,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('operator links fall back to the default repository without GITHUB_REPOSITORY', () => {
  const root = mkdtempSync(join(tmpdir(), 'axia-package-test-'))
  const output = join(root, 'bundle')
  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/package-release.mjs', output, image, revision, 'v0.1.0'],
      {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_REPOSITORY: '' },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    const readme = readFileSync(join(output, 'README.md'), 'utf8')
    assert.ok(
      readme.includes(`https://github.com/MarcosAvg/axia/blob/${revision}/`),
      readme,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('mutable latest is rejected without creating output', () => {
  const root = mkdtempSync(join(tmpdir(), 'axia-package-test-'))
  const output = join(root, 'bundle')
  try {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/package-release.mjs',
        output,
        'axia:latest',
        revision,
        'v0.1.0',
      ],
      { encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /immutable release image/)
    assert.ok(!existsSync(output))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
