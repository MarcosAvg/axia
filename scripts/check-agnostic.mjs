#!/usr/bin/env node
// Verifica que el núcleo no mencione plataformas de terceros.
// Ver docs/convenciones-codigo.md, secciones 4 y 14.
//
// Los nombres a buscar viven en scripts/agnostic-names.json (única excepción
// permitida). Aquí solo se define dónde sí se pueden nombrar.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

// Rutas donde se permite nombrar plataformas de terceros (sección 4).
const ALLOWED_PATTERNS = [
  'docs/integraciones-y-migracion.md',
  'docs/ESTADO.md',
  'docs/decisions/**',
  'scripts/**',
]

// Directorios que nunca se recorren.
const IGNORED_DIRS = new Set([
  '.git',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'dist-ssr',
  'node_modules',
  'playwright-report',
  'test-results',
])

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*')
  return new RegExp(`^${escaped}$`)
}

const allowedMatchers = ALLOWED_PATTERNS.map(globToRegExp)

function isAllowed(relativePath) {
  return allowedMatchers.some((matcher) => matcher.test(relativePath))
}

function loadNames() {
  const configPath = join(scriptDir, 'agnostic-names.json')
  let parsed
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (error) {
    throw new Error(`No se pudo leer ${configPath}: ${error.message}`)
  }
  const names = parsed?.names
  const isValid =
    Array.isArray(names) &&
    names.length > 0 &&
    names.every((name) => typeof name === 'string' && name.trim() !== '')
  if (!isValid) {
    throw new Error(
      `El archivo ${configPath} debe tener un arreglo "names" con nombres no vacíos.`,
    )
  }
  return names.map((name) => name.trim())
}

function walk(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name))
        walk(join(directory, entry.name), files)
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name))
    }
  }
  return files
}

function findMatches(text, names) {
  const lowerText = text.toLowerCase()
  const found = []
  for (const name of names) {
    const needle = name.toLowerCase()
    let index = lowerText.indexOf(needle)
    while (index !== -1) {
      const line = lowerText.slice(0, index).split('\n').length
      found.push({ name, line })
      index = lowerText.indexOf(needle, index + needle.length)
    }
  }
  return found
}

function main() {
  const names = loadNames()
  const files = walk(repoRoot, [])
  const violations = []

  for (const file of files) {
    const relativePath = relative(repoRoot, file).split(sep).join('/')
    if (isAllowed(relativePath)) continue

    const buffer = readFileSync(file)
    if (buffer.includes(0)) continue // binario

    for (const match of findMatches(buffer.toString('utf8'), names)) {
      violations.push({
        file: relativePath,
        line: match.line,
        name: match.name,
      })
    }
  }

  if (violations.length > 0) {
    console.error(
      'Nombres de plataformas de terceros fuera de las rutas permitidas:',
    )
    for (const violation of violations) {
      console.error(
        `  ${violation.file}:${violation.line}  "${violation.name}"`,
      )
    }
    console.error(
      `\n${violations.length} coincidencia(s). Ver docs/convenciones-codigo.md, sección 4.`,
    )
    process.exit(1)
  }

  console.log(
    `Independencia del núcleo verificada: ${files.length} archivos revisados, 0 coincidencias.`,
  )
}

main()
