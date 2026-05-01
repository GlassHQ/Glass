/** Lowercase trimmed email for storage and comparison. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Basic validation after normalize (server-side). */
export function isValidEmail(normalized: string): boolean {
  if (normalized.length < 3 || normalized.length > 254) return false
  const at = normalized.indexOf('@')
  if (at < 1) return false
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (!local || !domain || domain.includes('@')) return false
  if (!domain.includes('.')) return false
  return true
}
