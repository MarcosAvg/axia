import { useState } from 'react'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type { RiskMeasure } from '../domain/quality'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { DimensionPicker } from './dimension-picker'
import { QualityHeatmap } from './quality-heatmap'
import { RiskScatter } from './risk-scatter'

const t = metricsMessages.quality

/** Dónde falla: mapa de tasas y riesgo comparten dimensión. */
export function QualityDiagnosis({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const [measure, setMeasure] = useState<RiskMeasure>('reopen')
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-medium">{t.diagnosis}</h2>
        <DimensionPicker value={dimension} onChange={setDimension} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <QualityHeatmap groups={groups} dimension={dimension} />
        <RiskScatter
          groups={groups}
          dimension={dimension}
          measure={measure}
          mode={mode}
          onMeasureChange={setMeasure}
        />
      </div>
    </section>
  )
}
