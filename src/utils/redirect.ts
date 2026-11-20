export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!rawPath) return fallback;
  const trimmed = rawPath.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\')
  ) {
    return fallback;
  }
  return trimmed;
}