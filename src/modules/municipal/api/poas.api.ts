import type { AxiosProgressEvent } from 'axios'
import api from '@/services/api'
import type { DataResponse, PaginatedResponse } from '@/shared/api/types'
import type {
  CreatePoaPayload,
  MunicipalPoa,
  PoaFields,
  PoaFilters,
  PoaDocument,
  PoaDocumentFilters,
  UploadPoaDocumentPayload,
} from '../types/poa.types'

function poasPath(municipalityId: number): string {
  return `/admin/municipalities/${municipalityId}/poas`
}

function documentsPath(municipalityId: number, poaId: number): string {
  return `${poasPath(municipalityId)}/${poaId}/documents`
}

export const poasApi = {
  async index(municipalityId: number, filters: PoaFilters, signal: AbortSignal) {
    const { data } = await api.get<PaginatedResponse<MunicipalPoa>>(poasPath(municipalityId), {
      params: { ...filters, search: filters.search?.trim() || undefined },
      signal,
    })
    return data
  },
  async show(municipalityId: number, poaId: number, signal: AbortSignal) {
    const { data } = await api.get<DataResponse<MunicipalPoa>>(
      `${poasPath(municipalityId)}/${poaId}`,
      { signal },
    )
    return data.data
  },
  async create(municipalityId: number, payload: CreatePoaPayload) {
    const { data } = await api.post<DataResponse<MunicipalPoa>>(poasPath(municipalityId), payload)
    return data.data
  },
  async update(municipalityId: number, poaId: number, payload: PoaFields) {
    const { data } = await api.patch<DataResponse<MunicipalPoa>>(
      `${poasPath(municipalityId)}/${poaId}`,
      payload,
    )
    return data.data
  },
  async documents(
    municipalityId: number,
    poaId: number,
    filters: PoaDocumentFilters,
    signal: AbortSignal,
  ) {
    const { data } = await api.get<PaginatedResponse<PoaDocument>>(
      documentsPath(municipalityId, poaId),
      { params: filters, signal },
    )
    return data
  },
  async document(municipalityId: number, poaId: number, documentId: number, signal: AbortSignal) {
    const { data } = await api.get<DataResponse<PoaDocument>>(
      `${documentsPath(municipalityId, poaId)}/${documentId}`,
      { signal },
    )
    return data.data
  },
  async upload(
    municipalityId: number,
    poaId: number,
    payload: UploadPoaDocumentPayload,
    onUploadProgress: (event: AxiosProgressEvent) => void,
  ) {
    const form = new FormData()
    form.append('pdf', payload.pdf)
    form.append('title', payload.title.trim())
    for (const field of ['document_reference', 'received_at', 'notes'] as const) {
      if (payload[field].trim()) form.append(field, payload[field].trim())
    }
    const { data } = await api.post<DataResponse<PoaDocument>>(
      documentsPath(municipalityId, poaId),
      form,
      { timeout: 120000, onUploadProgress },
    )
    return data.data
  },
  async publish(municipalityId: number, poaId: number, documentId: number) {
    const { data } = await api.put<DataResponse<PoaDocument>>(
      `${documentsPath(municipalityId, poaId)}/${documentId}/publication`,
    )
    return data.data
  },
  file(municipalityId: number, poaId: number, documentId: number, signal: AbortSignal) {
    return api.get<Blob>(`${documentsPath(municipalityId, poaId)}/${documentId}/file`, {
      responseType: 'blob',
      timeout: 120000,
      signal,
    })
  },
}
