export interface MunicipalTerm {
  id: number
  municipality_id: number
  start_year: number
  end_year: number
  label: string
  authorities_count?: number
}
export interface MunicipalTermFields {
  start_year: number
  end_year: number
}
