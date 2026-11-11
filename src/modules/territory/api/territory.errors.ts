import { getApiError, type ApiError } from '@/shared/api/errors'

export function getTerritoryError(error: unknown): ApiError {
  const result = getApiError(error)

  if (result.status === 403) {
    result.message = 'No tienes autorización para consultar estos datos territoriales.'
  } else if (result.status === 404) {
    result.message = 'El registro territorial solicitado ya no está disponible.'
  } else if (result.status === 422) {
    result.message = Object.values(result.errors).flat().join(' ') || result.message
  } else if (result.status === null) {
    result.message =
      'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.'
  }

  return result
}
