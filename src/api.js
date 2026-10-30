export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, { credentials: 'include', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined })
  } catch { throw new Error('Cannot reach the server. Check your connection and retry.') }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }
  return body
}
