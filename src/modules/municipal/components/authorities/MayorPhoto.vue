<script setup lang="ts">
import type { MunicipalAuthority } from '../../types/authority.types'
import { useAuthorityPhoto } from '../../composables/useAuthorityPhoto'
import MunicipalFeedback from '../MunicipalFeedback.vue'
const props = defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  active: boolean
}>()
const { url, loading, error, reload } = useAuthorityPhoto(
  () => props.municipalityId,
  () => props.authority,
  () => props.active,
)
</script>
<template>
  <div class="flex w-full max-w-48 shrink-0 flex-col gap-2">
    <img
      v-if="url"
      :src="url"
      :alt="'Fotografía institucional de ' + authority.full_name"
      class="aspect-square w-full rounded-xl border border-border object-cover"
    />
    <div
      v-else
      class="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground"
      role="status"
    >
      {{ loading ? 'Cargando fotografía…' : 'Fotografía no disponible' }}
    </div>
    <MunicipalFeedback :error="error" retry @retry="reload" />
  </div>
</template>
