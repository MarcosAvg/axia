#!/usr/bin/env node
// Verifica que los enlaces relativos de la documentación apunten a archivos existentes.
import { readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listSourceFiles } from './source-inventory.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = listSourceFiles(root).filter((file) => file.endsWith('.md'))

function withoutCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
}

const broken = []
for (const relativePath of files) {
  const file = resolve(root, relativePath)
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
  `Documentación verificada: ${files.length} archivos, 0 enlaces rotos.`,
)
