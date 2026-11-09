import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import { listSourceFiles } from './source-inventory.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'axia-sources-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (file, text) => {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), text)
  }
  execFileSync('git', ['init', '-q', root])
  mkdirSync(join(root, 'scripts'))
  for (const file of ['check-docs.mjs', 'source-inventory.mjs']) {
    copyFileSync(new URL(file, import.meta.url), join(root, 'scripts', file))
  }
  return { root, write }
}

function run(root, script, excluded = []) {
  const guard = join(root, 'scripts/guard-read.mjs')
  writeFileSync(
    guard,
    `import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const excluded = ${JSON.stringify(excluded.map((file) => join(root, file)))};
const original = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  if (excluded.includes(String(file))) throw new Error('Intentó abrir un archivo excluido');
  return original.call(this, file, ...args);
};
syncBuiltinESMExports();
`,
  )
  return spawnSync(
    process.execPath,
    ['--import', guard, join(root, 'scripts', script)],
    { encoding: 'utf8' },
  )
}

test('excluye secretos, datos privados y salidas incluso versionados accidentalmente', (t) => {
  const { root, write } = fixture(t)
  const excluded = [
    '.env',
    '.env.dev',
    'apps/web/.env.local',
    'private.pem',
    'private.key',
    'private.pfx',
    'backups/dump.sql',
    'apps/server/data/evidence.txt',
    '.agents/private.md',
    '.codex/private.md',
    '.aws/private.md',
    'dist/output.js',
    'coverage/output.md',
    '.release/output.md',
    '.history/duplicate.md',
    '.tanstack/output.ts',
    'image.png',
  ]
  for (const file of excluded) write(file, 'Contenido privado')
  execFileSync('git', ['add', '--', ...excluded], { cwd: root })
  const result = run(root, 'check-docs.mjs', excluded)
  assert.equal(result.status, 0, result.stderr)
  const files = listSourceFiles(root)
  for (const file of excluded) assert.ok(!files.includes(file), file)
})

test('solo revisa fuentes nuevas no ignoradas y conserva plantillas dotenv', async (t) => {
  const { root, write } = fixture(t)
  write('.gitignore', 'private/\n')
  write('private/ignored.md', '[roto](missing.md)')
  write('.env.example', 'plantilla')
  write('docs/current.md', '[roto](missing.md)')
  const result = run(root, 'check-docs.mjs')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /docs\/current\.md/)
  assert.doesNotMatch(result.stderr, /private\/ignored/)
  const { listSourceFiles } = await import('./source-inventory.mjs')
  const files = listSourceFiles(root)
  assert.ok(files.includes('.env.example'))
  assert.ok(!files.includes('private/ignored.md'))
})

test('no sigue symlinks de archivos ni de directorios', (t) => {
  const { root, write } = fixture(t)
  write('private/secret.md', '[roto](missing.md)')
  write('.gitignore', 'private/\n')
  symlinkSync(join(root, 'private/secret.md'), join(root, 'linked.md'))
  symlinkSync(join(root, 'private'), join(root, 'linked-dir'))
  const result = run(root, 'check-docs.mjs')
  assert.equal(result.status, 0, result.stderr)
})

test('docs revisa historia fuente, pero no documentación ignorada o generada', (t) => {
  const { root, write } = fixture(t)
  write('.gitignore', 'archive/\n')
  write('archive/old.md', '[roto](missing.md)')
  write('coverage/report.md', '[roto](missing.md)')
  write('docs/history/current.md', '[correcto](../guide.md)')
  write('docs/guide.md', 'Guía')
  const result = run(root, 'check-docs.mjs')
  assert.equal(result.status, 0, result.stderr)
  write('docs/history/current.md', '[roto](missing.md)')
  const broken = run(root, 'check-docs.mjs')
  assert.equal(broken.status, 1)
  assert.match(broken.stderr, /docs\/history\/current\.md/)
})

test('inventario elimina duplicados, borrados y symlinks intermedios sin abrir contenidos', () => {
  const visited = []
  const git = (command, args) => {
    assert.equal(command, 'git')
    if (args.includes('--ignored')) {
      assert.deepEqual(args, [
        'ls-files',
        '-z',
        '--cached',
        '--ignored',
        '--exclude-standard',
      ])
      return 'ignored.ts\0'
    }
    assert.deepEqual(args, [
      'ls-files',
      '-z',
      '--cached',
      '--others',
      '--exclude-standard',
    ])
    return 'new.ts\0new.ts\0ignored.ts\0gone.ts\0link/nested.ts\0.env\0private.pem\0../outside.ts\0'
  }
  const stat = (path) => {
    visited.push(path)
    if (path.endsWith('/gone.ts'))
      throw Object.assign(new Error('borrado'), { code: 'ENOENT' })
    return {
      isSymbolicLink: () => path.endsWith('/link'),
      isFile: () => path.endsWith('.ts'),
      isDirectory: () => false,
    }
  }
  assert.deepEqual(listSourceFiles('/fixture', { git, stat }), ['new.ts'])
  assert.ok(
    !visited.some(
      (path) =>
        path.includes('.env') ||
        path.endsWith('.pem') ||
        path.endsWith('/ignored.ts'),
    ),
  )
})

test('no abre credenciales JSON versionadas ni directorios de claves y conserva documentos', (t) => {
  const { root, write } = fixture(t)
  const excluded = [
    'credentials.json',
    'config/service-account.json',
    'config/private-key.json',
    '.ssh/config',
    '.gnupg/options.conf',
    'secrets/development.json',
    'credentials/local.json',
    'keys/local.json',
    'id_rsa',
  ]
  for (const file of excluded) write(file, '{"fixture":"privado"}')
  execFileSync('git', ['add', '--', ...excluded], { cwd: root })
  const result = run(root, 'check-docs.mjs', excluded)
  assert.equal(result.status, 0, result.stderr)
  write('apps/server/src/secrets.md', '[roto](missing.md)')
  const source = run(root, 'check-docs.mjs', excluded)
  assert.equal(source.status, 1)
  assert.match(source.stderr, /apps\/server\/src\/secrets\.md/)
  const files = listSourceFiles(root)
  for (const file of [
    'credentials.json',
    'config/service-account.json',
    'config/private-key.json',
    'id_rsa',
    '.ssh/config',
    '.gnupg/options.conf',
    'secrets/development.json',
    'credentials/local.json',
    'keys/local.json',
  ]) {
    assert.ok(!files.includes(file), file)
  }
})

test('no abre archivos ignorados aunque estén forzados al índice de Git', (t) => {
  const { root, write } = fixture(t)
  const excluded = ['config/local-settings.json', 'docs/private-notes.md']
  write('.gitignore', excluded.join('\n') + '\n')
  write(excluded[0], '{"fixture":"privado"}')
  write(excluded[1], '[roto](missing.md)')
  execFileSync('git', ['add', '-f', '--', ...excluded], { cwd: root })
  const result = run(root, 'check-docs.mjs', excluded)
  assert.equal(result.status, 0, result.stderr)
  const files = listSourceFiles(root)
  for (const file of excluded) assert.ok(!files.includes(file), file)
})
