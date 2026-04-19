const rawApiBaseUrl = (import.meta.env.VITE_API_URL || '').trim()

export const API_BASE_URL = rawApiBaseUrl.endsWith('/')
  ? rawApiBaseUrl.slice(0, -1)
  : rawApiBaseUrl

export const buildApiUrl = (path) => {
  if (!path.startsWith('/')) {
    throw new Error(`La ruta API debe iniciar con '/': ${path}`)
  }

  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export const apiFetch = (path, options) => {
  return fetch(buildApiUrl(path), options)
}
