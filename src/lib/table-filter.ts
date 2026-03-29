/** True if `query` is empty or `haystack` contains `query` (case-insensitive). */
export function matchesText(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

/** Join non-empty parts with a separator for display/search blobs. */
export function joinSearchParts(parts: (string | null | undefined)[], sep = ' '): string {
  return parts.filter(Boolean).join(sep)
}
