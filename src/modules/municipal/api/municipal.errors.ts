import axios from 'axios'
import { getApiError, type ApiError } from '@/shared/api/errors'

export async function getMunicipalError(error: unknown): Promise<ApiError> {
  const result = getApiError(error)
  if (axios.isAxiosError<unknown>(error) && error.response?.data instanceof Blob) {
    try {
      const payload: unknown = JSON.parse(await error.response.data.text())
      if (typeof payload === 'object' && payload !== null) {
        if ('message' in payload && typeof payload.message === 'string')
          result.message = payload.message
        if ('errors' in payload && typeof payload.errors === 'object' && payload.errors !== null) {
          result.errors = Object.fromEntries(
            Object.entries(payload.errors).map(([field, messages]) => [
              field,
              typeof messages === 'string'
                ? [messages]
                : Array.isArray(messages)
                  ? messages.filter(
                      (message: unknown): message is string => typeof message === 'string',
                    )
                  : [],
            ]),
          )
        }
      }
    } catch {
      /* Una respuesta binaria de error puede no contener JSON. */
    }
  }
  if (result.status === 403)
    result.message = 'No tienes autorización para realizar esta operación municipal.'
  else if (result.status === 404)
    result.message = 'El municipio, POA o documento solicitado no está disponible.'
  else if (result.status === 429)
    result.message = 'Se alcanzó el límite de solicitudes. Espera un momento antes de reintentar.'
  else if (result.status === 413)
    result.message = 'El servidor rechazó el tamaño del archivo. Consulta el límite configurado.'
  else if (axios.isAxiosError(error) && result.status === null)
    result.message =
      'No se pudo confirmar la respuesta del servidor. Revisa el listado antes de reintentar la operación.'
  return result
}
