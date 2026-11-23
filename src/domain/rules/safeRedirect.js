// The `redirect` query on /login and /register says where to go after logging in. It comes from the URL, so it is untrusted:
// only an internal path is accepted, never another site ("//evil.com", "http://evil.com", "/\evil.com").
export function safeRedirect(target, fallback = '/') {
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//')) return fallback
  if (target.includes('\\')) return fallback
  return target
}
