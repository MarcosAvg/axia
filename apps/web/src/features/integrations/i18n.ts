// Textos del adaptador de importación (es-MX).

import { CATALOG_LABEL } from './adapters/candidates'
import type { CatalogName } from './adapters/candidates'

export const catalogLabels: Record<CatalogName, string> = CATALOG_LABEL

export const importMessages = {
  title: 'Importar archivo',
  help: 'Sube el archivo de origen (CSV o Excel). Primero se analiza (dry run) y no se escribe nada hasta confirmar.',
  system: 'Sistema de origen',
  file: 'Archivo (CSV o Excel)',
  analyze: 'Analizar (dry run)',
  analyzing: 'Analizando…',
  import: 'Confirmar importación',
  importing: 'Importando…',
  report: {
    title: 'Reporte de calidad',
    total: 'Filas',
    ok: 'Listas',
    alias: 'Alias sin resolver',
    status: 'Estatus sin mapear',
    invalid: 'Inválidas',
  },
  aliases: {
    title: 'Alias sin resolver',
    help: 'Elige a qué registro del catálogo corresponde cada texto y guarda.',
    save: 'Guardar',
  },
  statuses: {
    title: 'Estatus sin mapear',
    help: 'Indica a qué estado de Axia corresponde cada estatus de origen.',
    save: 'Guardar',
  },
  reanalyze: 'Tras resolver, vuelve a analizar para actualizar el reporte.',
  imported: (count: number) => `Tiquets importados: ${count}.`,
  error: 'No se pudo completar la operación.',
  needSystem: 'Indica el sistema de origen y elige un archivo.',
} as const
