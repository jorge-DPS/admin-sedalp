import type { AxiosProgressEvent } from 'axios'
import api from '@/services/api'
import type { DataResponse, PaginatedResponse } from '@/shared/api/types'
import type {
  MunicipalPoaVersion,
  PoaDocumentFilters,
  PoaVersionDocument,
  PoaUploadSession,
  UploadPoaDocumentPayload,
} from '../types/poa.types'
const path = (municipalityId: number, poaId: number) =>
  '/admin/municipalities/' + municipalityId + '/poas/' + poaId + '/versions'
const versionPath = (municipalityId: number, poaId: number, versionId: number) =>
  path(municipalityId, poaId) + '/' + versionId
export const poaVersionsApi = {
  async index(
    municipalityId: number,
    poaId: number,
    filters: PoaDocumentFilters,
    signal: AbortSignal,
  ) {
    const { data } = await api.get<PaginatedResponse<MunicipalPoaVersion>>(
      path(municipalityId, poaId),
      { params: filters, signal },
    )
    return data
  },
  async create(municipalityId: number, poaId: number) {
    const { data } = await api.post<DataResponse<MunicipalPoaVersion>>(path(municipalityId, poaId))
    return data.data
  },
  async publish(municipalityId: number, poaId: number, versionId: number) {
    const { data } = await api.put<DataResponse<MunicipalPoaVersion>>(
      versionPath(municipalityId, poaId, versionId) + '/publication',
    )
    return data.data
  },
  async documents(
    municipalityId: number,
    poaId: number,
    versionId: number,
    page: number,
    signal: AbortSignal,
  ) {
    const { data } = await api.get<PaginatedResponse<PoaVersionDocument>>(
      versionPath(municipalityId, poaId, versionId) + '/documents',
      { params: { page, per_page: 15 }, signal },
    )
    return data
  },
  async document(
    municipalityId: number,
    poaId: number,
    versionId: number,
    documentId: number,
    signal: AbortSignal,
  ) {
    const { data } = await api.get<DataResponse<PoaVersionDocument>>(
      versionPath(municipalityId, poaId, versionId) + '/documents/' + documentId,
      { signal },
    )
    return data.data
  },
  file(
    municipalityId: number,
    poaId: number,
    versionId: number,
    documentId: number,
    signal: AbortSignal,
  ) {
    return api.get<Blob>(
      versionPath(municipalityId, poaId, versionId) + '/documents/' + documentId + '/file',
      { responseType: 'blob', signal, timeout: 120000 },
    )
  },
  async upload(
    municipalityId: number,
    poaId: number,
    versionId: number,
    payload: UploadPoaDocumentPayload,
    progress: (event: AxiosProgressEvent) => void,
    signal: AbortSignal,
  ) {
    const form = new FormData()
    form.append('pdf', payload.pdf)
    form.append('title', payload.title.trim())
    for (const field of ['document_reference', 'received_at', 'notes'] as const)
      if (payload[field].trim()) form.append(field, payload[field].trim())
    const { data } = await api.post<DataResponse<PoaVersionDocument>>(
      versionPath(municipalityId, poaId, versionId) + '/documents',
      form,
      { onUploadProgress: progress, signal, timeout: 120000 },
    )
    return data.data
  },
  async startUpload(
    municipalityId: number,
    poaId: number,
    versionId: number,
    fields: {
      idempotency_key: string
      expected_size: number
      sha256: string
      original_filename: string
      title: string
      document_reference: string
      received_at: string
      notes: string
    },
    signal: AbortSignal,
  ) {
    const payload = {
      ...fields,
      document_reference: fields.document_reference || null,
      received_at: fields.received_at || null,
      notes: fields.notes || null,
    }
    const { data } = await api.post<DataResponse<PoaUploadSession>>(
      versionPath(municipalityId, poaId, versionId) + '/uploads',
      payload,
      { signal },
    )
    return data.data
  },
  async uploadStatus(
    municipalityId: number,
    poaId: number,
    versionId: number,
    uploadId: string,
    signal: AbortSignal,
  ) {
    const { data } = await api.get<DataResponse<PoaUploadSession>>(
      versionPath(municipalityId, poaId, versionId) + '/uploads/' + uploadId,
      { signal },
    )
    return data.data
  },
  async chunk(
    municipalityId: number,
    poaId: number,
    versionId: number,
    uploadId: string,
    index: number,
    chunk: Blob,
    sha256: string,
    signal: AbortSignal,
  ) {
    const form = new FormData()
    form.append('chunk', chunk, 'chunk.bin')
    form.append('sha256', sha256)
    const { data } = await api.put<DataResponse<PoaUploadSession>>(
      versionPath(municipalityId, poaId, versionId) + '/uploads/' + uploadId + '/chunks/' + index,
      form,
      { signal, timeout: 120000 },
    )
    return data.data
  },
  async complete(
    municipalityId: number,
    poaId: number,
    versionId: number,
    uploadId: string,
    signal: AbortSignal,
  ) {
    const { data } = await api.post<DataResponse<PoaUploadSession>>(
      versionPath(municipalityId, poaId, versionId) + '/uploads/' + uploadId + '/complete',
      undefined,
      { signal },
    )
    return data.data
  },
  async cancelUpload(municipalityId: number, poaId: number, versionId: number, uploadId: string) {
    await api.delete(versionPath(municipalityId, poaId, versionId) + '/uploads/' + uploadId)
  },
}
