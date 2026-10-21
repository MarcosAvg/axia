#!/usr/bin/env node
// Verifica que los enlaces relativos de la documentación apunten a archivos existentes.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ignored = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-ssr',
  'test-results',
  'playwright-report',
])

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) walk(join(dir, entry.name), files)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

function withoutCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
}

const broken = []
for (const file of walk(root)) {
  const text = withoutCode(readFileSync(file, 'utf8'))
  const base = dirname(file)
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]?.trim()
    if (!raw || /^(https?:|mailto:|#)/.test(raw)) continue
    const target = decodeURIComponent(raw.split('#')[0] ?? '')
    if (!target) continue
    const path = resolve(base, target)
    let ok = false
    try {
      ok = statSync(path).isFile() || statSync(path).isDirectory()
    } catch {
      ok = false
    }
    if (!ok) broken.push(`${relative(root, file)} -> ${raw}`)
  }
}

if (broken.length > 0) {
  console.error('Enlaces relativos rotos:')
  for (const item of broken) console.error(`  ${item}`)
  process.exit(1)
}
console.log(
  `Documentación verificada: ${walk(root).length} archivos, 0 enlaces rotos.`,
)
