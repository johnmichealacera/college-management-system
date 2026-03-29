/**
 * School year label from ISO date strings (YYYY-MM-DD), e.g. "2024–2025"
 * when the range spans two calendar years; a single year if both fall in the same year.
 */
export function schoolYearLabel(starts_on: string, ends_on: string): string {
  if (!starts_on?.trim() || !ends_on?.trim()) return '—'
  const sy = Number.parseInt(starts_on.slice(0, 4), 10)
  const ey = Number.parseInt(ends_on.slice(0, 4), 10)
  if (!Number.isFinite(sy) || !Number.isFinite(ey)) return '—'
  if (sy === ey) return String(sy)
  return `${sy}–${ey}`
}
