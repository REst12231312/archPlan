export const TOKEN_KEY = 'archplan:session:token'
export const ACTIVE_PROJECT_KEY = 'archplan:cloud-project-id'

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api${path}`, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') localStorage.removeItem(TOKEN_KEY)
    throw new Error(payload.error || `Сервер вернул ошибку ${response.status}.`)
  }
  return payload
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}
