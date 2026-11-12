import { HintLabel } from '@/components/shared/hint'
import { MeasureSelect } from '@/components/shared/measure-select'
import { metricsMessages } from '../i18n'

const t = metricsMessages.times

/** Cabecera de Tiempos: explica el alcance de los controles globales. */
export function TimesHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-medium">
          <HintLabel label={t.title} hint={metricsMessages.timesHints.header} />
        </h2>
      </div>
      <MeasureSelect />
    </div>
  )
}
