import { z } from 'zod'

const minutes = z.coerce.number().finite().min(0).max(10_000_000).optional()
const fence = z.coerce
  .number()
  .finite()
  .min(-10_000_000)
  .max(10_000_000)
  .optional()

export const phaseFilterFields = {
  phaseMinutesMin: minutes,
  phaseMinutesMax: minutes,
  phaseMinutesAbove: minutes,
  phaseMinutesBelow: minutes,
  phaseOutsideLow: fence,
  phaseOutsideHigh: fence,
}

type PhaseFilterValues = {
  phase?: string
  phaseMinutesMin?: number
  phaseMinutesMax?: number
  phaseMinutesAbove?: number
  phaseMinutesBelow?: number
  phaseOutsideLow?: number
  phaseOutsideHigh?: number
}

function requirePhase(value: PhaseFilterValues, ctx: z.RefinementCtx) {
  const hasMinutes =
    value.phaseMinutesMin !== undefined ||
    value.phaseMinutesMax !== undefined ||
    value.phaseMinutesAbove !== undefined ||
    value.phaseMinutesBelow !== undefined
  const hasFences =
    value.phaseOutsideLow !== undefined || value.phaseOutsideHigh !== undefined
  if ((hasMinutes || hasFences) && !value.phase) {
    ctx.addIssue({
      code: 'custom',
      message: 'Los filtros de minutos requieren una fase',
      path: ['phase'],
    })
  }
}

function requireBothFences(value: PhaseFilterValues, ctx: z.RefinementCtx) {
  if (
    (value.phaseOutsideLow === undefined) !==
    (value.phaseOutsideHigh === undefined)
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'La valla de atípicos requiere ambos límites',
      path: ['phaseOutsideLow'],
    })
  }
}

function validateFenceOrder(value: PhaseFilterValues, ctx: z.RefinementCtx) {
  if (
    value.phaseOutsideLow !== undefined &&
    value.phaseOutsideHigh !== undefined &&
    value.phaseOutsideLow >= value.phaseOutsideHigh
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'La valla inferior debe ser menor que la superior',
      path: ['phaseOutsideLow'],
    })
  }
}

function validateMinuteRange(value: PhaseFilterValues, ctx: z.RefinementCtx) {
  if (
    value.phaseMinutesMin !== undefined &&
    value.phaseMinutesMax !== undefined &&
    value.phaseMinutesMin > value.phaseMinutesMax
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'El mínimo de minutos no puede superar el máximo',
      path: ['phaseMinutesMin'],
    })
  }
}

/** Reglas de los filtros de fase que no puede expresar el esquema por campo. */
export function refinePhaseFilters(
  value: PhaseFilterValues,
  ctx: z.RefinementCtx,
) {
  requirePhase(value, ctx)
  requireBothFences(value, ctx)
  validateFenceOrder(value, ctx)
  validateMinuteRange(value, ctx)
}
