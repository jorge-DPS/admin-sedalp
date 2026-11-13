import { authoritiesApi } from '../api/authorities.api'
import { useMunicipalQuery } from './useMunicipalQuery'
import type { AuthorityFilters, MunicipalAuthority } from '../types/authority.types'
export function useAuthorities(
  municipalityId: () => number,
  filters: () => AuthorityFilters,
  revision: () => number,
) {
  return useMunicipalQuery(
    'municipal.authorities.view',
    () => [municipalityId(), filters(), revision()],
    (signal) => authoritiesApi.index(municipalityId(), filters(), signal),
  )
}
export function useCurrentMayor(municipalityId: () => number, revision: () => number) {
  return useMunicipalQuery(
    'municipal.authorities.view',
    () => [municipalityId(), revision()],
    async (signal) => {
      const items: MunicipalAuthority[] = []
      let page = 1
      let last = 1
      do {
        const result = await authoritiesApi.index(
          municipalityId(),
          { role: 'mayor', is_current: true, per_page: 100, page },
          signal,
        )
        signal.throwIfAborted()
        items.push(...result.data)
        last = result.meta.last_page
        page += 1
      } while (page <= last)
      if (items.length > 1)
        throw new Error(
          'El servidor devolvió más de un alcalde vigente. Actualiza los datos antes de continuar.',
        )
      return items[0] ?? null
    },
  )
}
