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

const getSocketBaseUrl = () => {
  if (API_BASE_URL) return API_BASE_URL

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`
  }

  return window.location.origin
}

export const SOCKET_BASE_URL = getSocketBaseUrl()

export const getComandas = async (estado = 'pendiente') => {
  const response = await apiFetch(`/api/comandas?estado=${encodeURIComponent(estado)}`)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'No se pudo obtener comandas')
  }

  return response.json()
}

export const marcarComandaLista = async (comandaId) => {
  const response = await apiFetch(`/api/comandas/${comandaId}/listo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo marcar la comanda como lista')
  }

  return data
}
