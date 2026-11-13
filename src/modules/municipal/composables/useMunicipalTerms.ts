import { termsApi } from '../api/terms.api'
import { useMunicipalQuery } from './useMunicipalQuery'
import type { MunicipalTerm } from '../types/term.types'
export function useMunicipalTerms(municipalityId: () => number) {
  return useMunicipalQuery('municipal.authorities.view', municipalityId, async (signal) => {
    const terms: MunicipalTerm[] = []
    let page = 1
    let last = 1
    do {
      const result = await termsApi.index(municipalityId(), page, signal)
      signal.throwIfAborted()
      terms.push(...result.data)
      last = result.meta.last_page
      page += 1
    } while (page <= last)
    return terms
  })
}
