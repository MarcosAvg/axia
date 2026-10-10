import {
  intervalToDays,
  isEvidencePolicy,
  isValidationPolicy,
  settingsToUpdate,
} from './settings'

describe('intervalToDays', () => {
  it('lee los días de un intervalo', () => {
    expect(intervalToDays('1 day')).toBe(1)
    expect(intervalToDays('2 days 03:00:00')).toBe(2)
  })

  it('devuelve cero sin valor', () => {
    expect(intervalToDays(null)).toBe(0)
    expect(intervalToDays('')).toBe(0)
  })
})

describe('validadores', () => {
  it('reconoce políticas válidas', () => {
    expect(isValidationPolicy('both')).toBe(true)
    expect(isValidationPolicy('otra')).toBe(false)
    expect(isEvidencePolicy('required')).toBe(true)
    expect(isEvidencePolicy('nope')).toBe(false)
  })
})

describe('settingsToUpdate', () => {
  it('arma el update con el intervalo en días', () => {
    const update = settingsToUpdate({
      teamLabel: 'Equipo',
      validationPolicy: 'both',
      autoValidationDays: null,
      claimWindowDays: 2,
      requestEvidencePolicy: 'recommended',
      folioPattern: 'AX-{yyyy}-{num}',
      timezone: 'America/Mexico_City',
      defaultCalendarId: null,
      slaClockMode: 'calendar',
      requesterVisibleEventTypes: ['created', 'taken'],
    })
    expect(update.claim_window).toBe('2 days')
    expect(update.auto_validation_days).toBeNull()
    expect(update.validation_policy).toBe('both')
    expect(update.default_calendar_id).toBeNull()
    expect(update.sla_clock_mode).toBe('calendar')
    expect(update.requester_visible_event_types).toEqual(['created', 'taken'])
  })
})
