export interface TerritorialCatalog {
  id: number
  name: string
  code: string | null
  active: boolean
  municipalities_count?: number
  created_at: string | null
  updated_at: string | null
}

export type Region = TerritorialCatalog
export type Province = TerritorialCatalog
export type TerritoryCatalogKind = 'regions' | 'provinces'

export interface Municipality {
  id: number
  region_id: number
  province_id: number
  name: string
  official_code: string | null
  active: boolean
  region?: Region | null
  province?: Province | null
  created_at: string | null
  updated_at: string | null
}

export interface TerritoryCatalogFilters {
  search?: string
  active?: boolean
  page?: number
  per_page?: number
}

export interface MunicipalityFilters extends TerritoryCatalogFilters {
  region_id?: number
  province_id?: number
}
