import { computed, onScopeDispose, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { authoritiesApi } from '../api/authorities.api'
import { getMunicipalError } from '../api/municipal.errors'
import type { MunicipalAuthority } from '../types/authority.types'
export function useAuthorityPhoto(
  municipalityId: () => number,
  authority: () => MunicipalAuthority,
  enabled: () => boolean,
) {
  const auth = useAuthStore()
  const url = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const permitted = computed(() => auth.hasPermission('municipal.authorities.view'))
  let request: AbortController | undefined
  function clear(): void {
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = null
  }
  async function reload(): Promise<void> {
    request?.abort()
    clear()
    loading.value = false
    error.value = null
    const item = authority()
    if (
      !enabled() ||
      !permitted.value ||
      item.role !== 'mayor' ||
      !item.has_photo ||
      item.municipality_id !== municipalityId()
    )
      return
    const controller = new AbortController()
    request = controller
    loading.value = true
    try {
      const response = await authoritiesApi.photo(municipalityId(), item.id, controller.signal)
      if (controller.signal.aborted) return
      if (response.data.type.split(';')[0] !== 'image/webp')
        throw new Error('El servidor no devolvió una fotografía WebP válida.')
      url.value = URL.createObjectURL(response.data)
    } catch (failure) {
      const result = await getMunicipalError(failure)
      if (!controller.signal.aborted) error.value = result
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }
  watch(
    () => [
      municipalityId(),
      authority().id,
      authority().has_photo,
      authority().updated_at,
      permitted.value,
      enabled(),
      auth.currentUser?.id,
    ],
    () => void reload(),
    { immediate: true },
  )
  onScopeDispose(() => {
    request?.abort()
    clear()
  })
  return { url, loading, error, reload }
}
