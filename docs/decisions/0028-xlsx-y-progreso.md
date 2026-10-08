# 0028 — Exportación XLSX y progreso de evidencia

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 5 quedó cerrada salvo la exportación **XLSX** (menor) y un par de detalles de interfaz:
mostrar el progreso real de la subida de evidencia y terminar de sustituir los estados de carga y
avisos.

## Decisión

- **XLSX con `exceljs`** (4.4.0, MIT, verificada). El libro se genera en el cliente y se descarga;
  la **construcción de las filas sigue siendo pura** (las mismas que el CSV) y el paquete se importa
  **en diferido** (`await import('@/lib/excel')`) al pulsar el botón, para no engordar el arranque.
  Botón “Exportar XLSX” junto al de CSV en la tabla por dimensión.
- **Progreso de evidencia**: `uploadResumable` (TUS) expone `onProgress`; el porcentaje se persiste
  en el registro local (`Evidence.progress`, campo sin índice, sin cambiar la clave primaria) y
  `PendingEvidence` muestra una barra `Progress` con el porcentaje mientras sube.
- **Interfaz**: `Skeleton`/`Alert` en las cargas restantes (lista de tiquets y bandejas) y `Tooltip`
  en las tarjetas KPI para explicar el indicador.

## Alternativas consideradas

- **`write-excel-file` (MIT)**: más ligera, pero se prefirió `exceljs` por ser la más establecida.
- **Solo CSV**: se descartó porque el XLSX estaba pedido.
- **Tooltip en todos los KPI**: se acotó a los no evidentes para no llenar de ruido.

## Consecuencias

- **Fase 5 cerrada al 100%**: no quedan pendientes salvo la vista laboral del SLA (el reloj ya se
  configura) y mejoras futuras.
- Nueva dependencia `exceljs` justificada (MIT) y cargada solo al exportar.
- El progreso es de cliente (Dexie); no cambia el servidor ni el núcleo.
