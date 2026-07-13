import DOMPurify from 'dompurify'

/**
 * Strip all HTML tags — safe for plain-text fields like node text / notes.
 */
export function sanitizeText(dirty: string | undefined | null): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Allow a curated set of safe URL schemes. Blocks javascript:, data:, blob:, etc.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return ''
  const clean = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
  if (/^(https?:|mailto:)/i.test(clean)) return clean
  return ''
}

/**
 * Lightweight protocol guard for inline markdown links.
 * Returns empty string if the URL uses a dangerous scheme.
 */
export function safeLinkUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (/^(javascript|data|vbscript|blob|file):/i.test(trimmed)) return ''
  return trimmed
}
