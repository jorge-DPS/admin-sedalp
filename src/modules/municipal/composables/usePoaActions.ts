import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { poasApi } from '../api/poas.api'
import { getMunicipalError } from '../api/municipal.errors'
import type { CreatePoaPayload, PoaFields, UploadPoaDocumentPayload } from '../types/poa.types'

export function useMunicipalMutation() {
  const busy = ref(false)
  const error = ref<ApiError | null>(null)
  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    if (busy.value) return null
    busy.value = true
    error.value = null
    try {
      return await operation()
    } catch (failure) {
      error.value = await getMunicipalError(failure)
      return null
    } finally {
      busy.value = false
    }
  }
  return { busy, error, run }
}

export function usePoaActions(municipalityId: number) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  return {
    ...mutation,
    create: (payload: CreatePoaPayload) =>
      mutation.run(() => {
        if (!auth.hasPermission('municipal.poas.create'))
          throw new Error('No tienes permiso para registrar POA.')
        return poasApi.create(municipalityId, payload)
      }),
    update: (id: number, payload: PoaFields) =>
      mutation.run(() => {
        if (!auth.hasPermission('municipal.poas.update'))
          throw new Error('No tienes permiso para editar POA.')
        return poasApi.update(municipalityId, id, payload)
      }),
  }
}

export function usePoaDocumentActions(municipalityId: number, poaId: number) {
  const auth = useAuthStore()
  const mutation = useMunicipalMutation()
  const progress = ref<number | null>(null)
  return {
    ...mutation,
    progress,
    upload: (payload: UploadPoaDocumentPayload) =>
      mutation.run(async () => {
        progress.value = null
        if (!auth.hasPermission('municipal.documents.upload'))
          throw new Error('No tienes permiso para subir documentos.')
        if (
          !/\.pdf$/i.test(payload.pdf.name) ||
          (payload.pdf.type && payload.pdf.type !== 'application/pdf') ||
          (await payload.pdf.slice(0, 5).text()) !== '%PDF-'
        ) {
          throw new Error(
            'Selecciona un archivo PDF válido. El contenido debe tener una cabecera PDF.',
          )
        }
        return poasApi.upload(municipalityId, poaId, payload, (event) => {
          progress.value = event.total
            ? Math.min(100, Math.round((event.loaded / event.total) * 100))
            : null
        })
      }),
    publish: (documentId: number) =>
      mutation.run(() => {
        if (!auth.hasPermission('municipal.documents.publish'))
          throw new Error('No tienes permiso para publicar documentos.')
        return poasApi.publish(municipalityId, poaId, documentId)
      }),
  }
}
