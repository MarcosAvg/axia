import { ALERT_FINDINGS } from './alerts.js'
import { DURATION_FINDINGS } from './durations.js'
import { TIME_FINDINGS } from './time.js'

export const FINDINGS = [
  ...TIME_FINDINGS,
  ...DURATION_FINDINGS,
  ...ALERT_FINDINGS,
]
