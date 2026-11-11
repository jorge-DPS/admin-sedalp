import api from '@/services/api'
import type { DataResponse, PaginatedResponse } from '@/shared/api/types'
import type {
  Municipality,
  MunicipalityFilters,
  Province,
  Region,
  TerritoryCatalogFilters,
} from '../types/territory.types'

export const territoryApi = {
  async regions(
    filters: TerritoryCatalogFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Region>> {
    const { data } = await api.get<PaginatedResponse<Region>>('/admin/regions', {
      params: { ...filters, search: filters.search?.trim() || undefined },
      signal,
    })
    return data
  },

  async provinces(
    filters: TerritoryCatalogFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Province>> {
    const { data } = await api.get<PaginatedResponse<Province>>('/admin/provinces', {
      params: { ...filters, search: filters.search?.trim() || undefined },
      signal,
    })
    return data
  },

  async municipalities(
    filters: MunicipalityFilters = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Municipality>> {
    const { data } = await api.get<PaginatedResponse<Municipality>>('/admin/municipalities', {
      params: { ...filters, search: filters.search?.trim() || undefined },
      signal,
    })
    return data
  },

  async municipality(id: number, signal?: AbortSignal): Promise<Municipality> {
    const { data } = await api.get<DataResponse<Municipality>>(`/admin/municipalities/${id}`, {
      signal,
    })
    return data.data
  },
}
