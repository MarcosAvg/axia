export function iso(value: Date | string): string {
  return new Date(value).toISOString()
}

export function optionalIso(value: Date | string | null): string | null {
  return value === null ? null : iso(value)
}
