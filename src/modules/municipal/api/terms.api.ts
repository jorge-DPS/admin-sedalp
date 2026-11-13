import api from '@/services/api'
import type { DataResponse, PaginatedResponse } from '@/shared/api/types'
import type { MunicipalTerm, MunicipalTermFields } from '../types/term.types'
const path = (municipalityId: number) => '/admin/municipalities/' + municipalityId + '/terms'
export const termsApi = {
  async index(municipalityId: number, page: number, signal: AbortSignal) {
    const { data } = await api.get<PaginatedResponse<MunicipalTerm>>(path(municipalityId), {
      params: { page, per_page: 100 },
      signal,
    })
    return data
  },
  async create(municipalityId: number, fields: MunicipalTermFields) {
    const { data } = await api.post<DataResponse<MunicipalTerm>>(path(municipalityId), fields)
    return data.data
  },
  async update(municipalityId: number, termId: number, fields: MunicipalTermFields) {
    const { data } = await api.patch<DataResponse<MunicipalTerm>>(
      path(municipalityId) + '/' + termId,
      fields,
    )
    return data.data
  },
}
