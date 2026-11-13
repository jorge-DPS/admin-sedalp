import type { AxiosProgressEvent } from 'axios'
import api from '@/services/api'
import type { DataResponse, PaginatedResponse } from '@/shared/api/types'
import type {
  MunicipalAuthority,
  AuthorityFields,
  AuthorityFilters,
  CreateAuthorityPayload,
  MayorTransitionPayload,
} from '../types/authority.types'
function authoritiesPath(municipalityId: number): string {
  return '/admin/municipalities/' + municipalityId + '/authorities'
}
export const authoritiesApi = {
  async index(municipalityId: number, filters: AuthorityFilters, signal: AbortSignal) {
    const { data } = await api.get<PaginatedResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId),
      {
        params: { ...filters, search: filters.search?.trim() || undefined },
        signal,
      },
    )
    return data
  },
  async show(municipalityId: number, id: number, signal: AbortSignal) {
    const { data } = await api.get<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId) + '/' + id,
      { signal },
    )
    return data.data
  },
  async create(municipalityId: number, payload: CreateAuthorityPayload) {
    const { data } = await api.post<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId),
      payload,
    )
    return data.data
  },
  async update(municipalityId: number, id: number, payload: AuthorityFields) {
    const { data } = await api.patch<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId) + '/' + id,
      payload,
    )
    return data.data
  },
  async publish(municipalityId: number, id: number, isPublished: boolean) {
    const { data } = await api.put<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId) + '/' + id + '/publication',
      { is_published: isPublished },
    )
    return data.data
  },
  async transition(municipalityId: number, id: number, payload: MayorTransitionPayload) {
    const { data } = await api.put<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId) + '/' + id + '/current',
      payload,
    )
    return data.data
  },
  async uploadPhoto(
    municipalityId: number,
    id: number,
    photo: File,
    onUploadProgress: (event: AxiosProgressEvent) => void,
  ) {
    const form = new FormData()
    form.append('photo', photo)
    const { data } = await api.post<DataResponse<MunicipalAuthority>>(
      authoritiesPath(municipalityId) + '/' + id + '/photo',
      form,
      { timeout: 120000, onUploadProgress },
    )
    return data.data
  },
  photo(municipalityId: number, id: number, signal: AbortSignal) {
    return api.get<Blob>(authoritiesPath(municipalityId) + '/' + id + '/photo', {
      responseType: 'blob',
      signal,
    })
  },
}
