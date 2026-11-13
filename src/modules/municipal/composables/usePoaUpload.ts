import { onScopeDispose, ref, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { getMunicipalError } from '../api/municipal.errors'
import { poaVersionsApi } from '../api/poaVersions.api'
import type {
  PoaUploadSession,
  PoaVersionDocument,
  UploadPoaDocumentPayload,
} from '../types/poa.types'
import { fileSha256 } from '../utils/file.sha256'
export function usePoaUpload(
  municipalityId: number,
  poaId: number,
  versionId: number,
  writable: () => boolean,
) {
  const auth = useAuthStore()
  const busy = ref(false),
    progress = ref<number | null>(null),
    message = ref('')
  const error = ref<ApiError | null>(null)
  const session = shallowRef<PoaUploadSession | null>(null)
  let controller: AbortController | undefined
  let transferKey = crypto.randomUUID()
  function pause() {
    controller?.abort()
    message.value = session.value
      ? 'Carga pausada. Puedes reanudarla sin volver a enviar los fragmentos recibidos.'
      : 'Preparación pausada. Puedes volver a iniciar la carga.'
  }
  async function discard(): Promise<boolean> {
    if (busy.value) return false
    if (session.value) {
      try {
        await poaVersionsApi.cancelUpload(municipalityId, poaId, versionId, session.value.id)
      } catch (failure) {
        const reason = await getMunicipalError(failure)
        if (reason.status !== 404 && reason.status !== 410) {
          error.value = reason
          return false
        }
      }
    }
    session.value = null
    transferKey = crypto.randomUUID()
    message.value = ''
    return true
  }
  async function upload(payload: UploadPoaDocumentPayload): Promise<PoaVersionDocument | null> {
    if (busy.value) return null
    error.value = null
    controller = new AbortController()
    const signal = controller.signal
    busy.value = true
    progress.value = null
    try {
      if (!writable() || !auth.hasPermission('municipal.documents.upload'))
        throw new Error('No tienes autorización para adjuntar documentos a esta versión.')
      if (
        !/\.pdf$/i.test(payload.pdf.name) ||
        (payload.pdf.type && payload.pdf.type !== 'application/pdf') ||
        (await payload.pdf.slice(0, 5).text()) !== '%PDF-'
      )
        throw new Error('Selecciona un archivo PDF válido.')
      if (payload.pdf.size <= 16 * 1024 * 1024 && !session.value) {
        message.value = 'Validando y enviando PDF…'
        return await poaVersionsApi.upload(
          municipalityId,
          poaId,
          versionId,
          payload,
          (event) => {
            progress.value = event.total
              ? Math.min(100, Math.round((event.loaded / event.total) * 100))
              : null
          },
          signal,
        )
      }
      if (!session.value) {
        message.value = 'Preparando el archivo para una carga reanudable…'
        const sha256 = await fileSha256(payload.pdf, signal, (bytes) => {
          progress.value = Math.round((bytes / payload.pdf.size) * 100)
        })
        const { pdf: file, ...fields } = payload
        session.value = await poaVersionsApi.startUpload(
          municipalityId,
          poaId,
          versionId,
          {
            ...fields,
            idempotency_key: transferKey,
            expected_size: file.size,
            sha256,
            original_filename: file.name,
          },
          signal,
        )
      } else
        session.value = await poaVersionsApi.uploadStatus(
          municipalityId,
          poaId,
          versionId,
          session.value.id,
          signal,
        )
      if (session.value.status === 'completed' && session.value.document_id)
        return await poaVersionsApi.document(
          municipalityId,
          poaId,
          versionId,
          session.value.document_id,
          signal,
        )
      message.value = 'Enviando PDF. Puedes pausar y reanudar la carga.'
      const received = new Set(session.value.received_chunks)
      for (let index = 0; index < session.value.total_chunks; index++) {
        signal.throwIfAborted()
        if (!received.has(index)) {
          const chunk = payload.pdf.slice(
            index * session.value.chunk_size,
            Math.min((index + 1) * session.value.chunk_size, payload.pdf.size),
          )
          const sha256 = await fileSha256(chunk, signal)
          session.value = await poaVersionsApi.chunk(
            municipalityId,
            poaId,
            versionId,
            session.value.id,
            index,
            chunk,
            sha256,
            signal,
          )
        }
        progress.value = Math.round((session.value.received_bytes / payload.pdf.size) * 100)
      }
      if (session.value.status === 'receiving' || session.value.status === 'failed')
        session.value = await poaVersionsApi.complete(
          municipalityId,
          poaId,
          versionId,
          session.value.id,
          signal,
        )
      message.value =
        'El servidor está validando y registrando el PDF. Puedes pausar la espera y consultar de nuevo.'
      while (session.value.status !== 'completed') {
        if (session.value.status === 'failed')
          throw new Error('No se pudo completar la carga. Puedes reintentar o cancelarla.')
        await new Promise<void>((resolve, reject) => {
          const aborted = () => {
            clearTimeout(timer)
            reject(new DOMException('Carga pausada', 'AbortError'))
          }
          const timer = setTimeout(() => {
            signal.removeEventListener('abort', aborted)
            resolve()
          }, 1000)
          signal.addEventListener('abort', aborted, { once: true })
          if (signal.aborted) aborted()
        })
        session.value = await poaVersionsApi.uploadStatus(
          municipalityId,
          poaId,
          versionId,
          session.value.id,
          signal,
        )
      }
      if (!session.value.document_id)
        throw new Error('El servidor no confirmó el documento registrado.')
      const result = await poaVersionsApi.document(
        municipalityId,
        poaId,
        versionId,
        session.value.document_id,
        signal,
      )
      session.value = null
      transferKey = crypto.randomUUID()
      return result
    } catch (failure) {
      if (!signal.aborted) error.value = await getMunicipalError(failure)
      return null
    } finally {
      busy.value = false
    }
  }
  onScopeDispose(() => controller?.abort())
  return { busy, progress, message, error, session, pause, discard, upload }
}
