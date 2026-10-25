const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a well-formed UUID.
 */
export function isValidUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Sanitizes a filename to prevent HTTP header injection, directory traversal,
 * and character encoding vulnerabilities.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'document';
  }

  // 1. Remove path traversal characters (slashes and backslashes)
  let clean = filename.replace(/^.*[\\/]/, '');

  // 2. Remove CRLF and control characters to prevent HTTP response splitting
  clean = clean.replace(/[\r\n\x00-\x1f\x7f]/g, '');

  // 3. Remove quotes that could break Content-Disposition syntax
  clean = clean.replace(/["']/g, '_');

  // 4. Fallback if empty after sanitization
  const trimmed = clean.trim();
  return trimmed.length > 0 ? trimmed : 'document';
}

/**
 * Formats a Content-Disposition header safely adhering to RFC 6266 and RFC 5987.
 */
export function formatContentDisposition(
  type: 'inline' | 'attachment',
  filename: string
): string {
  const safeAscii = sanitizeFilename(filename).replace(/[^\x20-\x7E]/g, '_');
  const encodedUtf8 = encodeURIComponent(sanitizeFilename(filename));

  return `${type}; filename="${safeAscii}"; filename*=UTF-8''${encodedUtf8}`;
}
