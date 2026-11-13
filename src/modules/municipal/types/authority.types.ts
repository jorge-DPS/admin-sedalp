export type MunicipalAuthorityRole = 'mayor' | 'council_member'
export interface MunicipalAuthority {
  id: number
  municipality_id: number
  municipal_term_id: number | null
  full_name: string
  position_title: string | null
  is_current: boolean
  is_published: boolean
  source_reference: string | null
  notes: string | null
  role: MunicipalAuthorityRole
  term_start: string | null
  term_end: string | null
  has_photo: boolean
  created_at: string | null
  updated_at: string | null
}
export interface AuthorityFields {
  municipal_term_id?: number
  full_name?: string
  position_title?: string | null
  term_start?: string | null
  term_end?: string | null
  is_current?: boolean
  source_reference?: string | null
  notes?: string | null
}
export interface CreateAuthorityPayload extends AuthorityFields {
  municipal_term_id: number
  full_name: string
  role: MunicipalAuthorityRole
}
export interface AuthorityFilters {
  municipal_term_id?: number
  page?: number
  per_page?: number
  role?: MunicipalAuthorityRole
  is_current?: boolean
  is_published?: boolean
  search?: string
}
export interface MayorTransitionPayload {
  previous_authority_id: number
  previous_term_end: string
}
