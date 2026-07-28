export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? ''

export function apiPath(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = API_BASE_URL.replace(/\/$/, '')

  if (!base) {
    return normalized.startsWith('/api') ? normalized : `/api${normalized}`
  }

  if (normalized.startsWith('/api')) {
    return `${base}${normalized}`
  }

  return `${base}/api${normalized}`
}

export function authHeaders(_token?: string, _preferAdminToken = false) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  try {
    return await fetch(apiPath(path), { ...init, credentials: 'include' })
  } catch (error) {
    console.error('[api] fetch error', path, error)
    throw error
  }
}
