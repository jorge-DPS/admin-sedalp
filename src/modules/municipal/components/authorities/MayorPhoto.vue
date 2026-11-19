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
      width="160"
      height="160"
      class="aspect-square w-full rounded-xl border border-border object-cover"
    />
    <div
      v-else
      class="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-center text-[0.65rem] leading-tight text-muted-foreground"
      role="status"
    >
      <i class="ki-filled ki-user text-xl" aria-hidden="true" />
      {{ loading ? 'Cargando foto…' : 'Sin fotografía' }}
    </div>
    <MunicipalFeedback :error="error" retry @retry="reload" />
  </div>
</template>
