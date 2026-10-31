import { execFileSync } from 'node:child_process'
import { lstatSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const excludedDirectories = new Set([
  '.git',
  '.agents',
  '.codex',
  '.aws',
  '.ssh',
  '.gnupg',
  'secrets',
  'credentials',
  'keys',
  '.superpowers',
  '.turbo',
  '.vite',
  '.cache',
  '.release',
  '.history',
  '.tanstack',
  'node_modules',
  'coverage',
  'dist',
  'dist-ssr',
  'build',
  'playwright-report',
  'test-results',
  'backups',
  'backup',
])
const credentialNames = new Set([
  'credentials.json',
  'service-account.json',
  'private-key.json',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
])
const environmentExamples = new Set([
  '.env.example',
  '.env.dev.example',
  '.env.test.example',
])
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.sql',
  '.css',
  '.scss',
  '.html',
  '.svg',
  '.txt',
  '.sh',
  '.conf',
  '.toml',
  '.xml',
  '.webmanifest',
])
const sourceNames = new Set([
  '.gitignore',
  '.dockerignore',
  '.prettierignore',
  '.prettierrc',
  '.npmrc',
  '.nvmrc',
  '.node-version',
  '.editorconfig',
  'LICENSE',
  'NOTICE',
])

function isSourcePath(file) {
  const parts = file.split('/')
  if (
    parts.some(
      (part) => !part || part === '..' || excludedDirectories.has(part),
    )
  )
    return false
  if (file.startsWith('apps/server/data/')) return false
  const name = basename(file)
  if (credentialNames.has(name)) return false
  if (name === '.env' || name.startsWith('.env.'))
    return environmentExamples.has(name)
  return (
    sourceNames.has(name) ||
    /^Dockerfile(?:\.[\w-]+)?$/.test(name) ||
    sourceExtensions.has(extname(name).toLowerCase())
  )
}

function isExistingSource(root, file, stat) {
  const parts = file.split('/')
  try {
    for (let index = 0; index < parts.length; index++) {
      const entry = stat(join(root, ...parts.slice(0, index + 1)))
      if (entry.isSymbolicLink()) return false
      if (index === parts.length - 1) return entry.isFile()
      if (!entry.isDirectory()) return false
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
  }
  return false
}

// Git delimita las fuentes; el filtro adicional protege incluso archivos privados
// o salidas que alguien haya añadido al índice por accidente. No abre contenidos.
export function listSourceFiles(
  root,
  { git = execFileSync, stat = lstatSync } = {},
) {
  const options = { cwd: root, encoding: 'utf8' }
  const output = git(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    options,
  )
  // --exclude-standard solo filtra los nuevos: hay que restar también los
  // ignorados que ya estaban en el índice, sin abrir sus contenidos.
  const ignoredOutput = git(
    'git',
    ['ls-files', '-z', '--cached', '--ignored', '--exclude-standard'],
    options,
  )
  const ignoredFiles = new Set(ignoredOutput.split('\0').filter(Boolean))
  return [...new Set(output.split('\0').filter(Boolean))]
    .filter((file) => !ignoredFiles.has(file) && isSourcePath(file))
    .filter((file) => isExistingSource(root, file, stat))
    .sort()
}
