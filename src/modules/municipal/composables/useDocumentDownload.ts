import { onScopeDispose } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { poasApi } from '../api/poas.api'
import { downloadFilename } from '../utils/municipal.format'
import { useMunicipalMutation } from './usePoaActions'

export function useDocumentDownload(municipalityId: number, poaId: number, fiscalYear: number) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  const request = new AbortController()
  const urls = new Set<string>()
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function download(documentId: number, version: number) {
    return mutation.run(async () => {
      if (!auth.hasPermission('municipal.documents.view'))
        throw new Error('No tienes permiso para descargar documentos.')
      const response = await poasApi.file(municipalityId, poaId, documentId, request.signal)
      if (request.signal.aborted) return false
      if ((await response.data.slice(0, 5).text()) !== '%PDF-')
        throw new Error('El servidor no devolvió un archivo PDF válido.')
      if (request.signal.aborted) return false
      const url = URL.createObjectURL(response.data)
      urls.add(url)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadFilename(
        response.headers['content-disposition'],
        `poa-${fiscalYear}-v${version}.pdf`,
      )
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url)
        urls.delete(url)
        timers.delete(timer)
      }, 1000)
      timers.add(timer)
      return true
    })
  }
  onScopeDispose(() => {
    request.abort()
    timers.forEach(clearTimeout)
    urls.forEach((url) => URL.revokeObjectURL(url))
  })
  return { busy: mutation.busy, error: mutation.error, download }
}
