<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import type { MunicipalAuthority } from '../../types/authority.types'
import { municipalDate } from '../../utils/municipal.format'
import MayorPhoto from './MayorPhoto.vue'
import AuthorityStateSwitch from './AuthorityStateSwitch.vue'
defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  writable: boolean
  active: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{
  edit: [authority: MunicipalAuthority]
  busy: [value: boolean]
  publicationChanged: [authority: MunicipalAuthority]
}>()
const auth = useAuthStore()
</script>
<template>
  <article class="flex min-w-0 flex-col gap-3 px-3.5 py-3.5">
    <div class="flex min-w-0 items-center gap-3">
      <div class="w-16 shrink-0">
        <MayorPhoto :municipality-id="municipalityId" :authority="authority" :active="active" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
        <h4 class="break-words text-base font-semibold leading-snug">
          {{ authority.full_name }}
        </h4>
        <p class="break-words text-xs text-muted-foreground">
          {{ authority.position_title ?? 'Alcalde o alcaldesa municipal' }}
        </p>
        <span
          class="kt-badge kt-badge-outline"
          :class="authority.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
          >{{ authority.is_current ? 'Vigente' : 'Histórico' }}</span
        >
      </div>
    </div>
    <dl class="grid grid-cols-2 gap-2 rounded-md bg-muted/25 p-2.5 text-xs">
      <div class="min-w-0">
        <dt class="text-muted-foreground">Inicio del mandato</dt>
        <dd class="mt-0.5 font-medium tabular-nums">{{ municipalDate(authority.term_start) }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-muted-foreground">Fin del mandato</dt>
        <dd class="mt-0.5 font-medium tabular-nums">{{ municipalDate(authority.term_end) }}</dd>
      </div>
    </dl>
    <details v-if="authority.source_reference || authority.notes" class="min-w-0">
      <summary
        class="cursor-pointer rounded-sm text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring"
      >
        Fuente y observaciones
      </summary>
      <dl class="mt-2.5 space-y-2.5 text-sm">
        <div v-if="authority.source_reference" class="min-w-0">
          <dt class="text-xs text-muted-foreground">Fuente o referencia</dt>
          <dd class="mt-1 whitespace-pre-wrap break-words font-medium leading-relaxed">
            {{ authority.source_reference }}
          </dd>
        </div>
        <div v-if="authority.notes" class="min-w-0">
          <dt class="text-xs text-muted-foreground">Observaciones</dt>
          <dd class="mt-1 whitespace-pre-wrap break-words leading-relaxed">
            {{ authority.notes }}
          </dd>
        </div>
      </dl>
    </details>
    <div
      class="flex flex-wrap-reverse items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-2.5"
    >
      <button
        v-if="
          writable &&
          (auth.hasPermission('municipal.authorities.update') ||
            auth.hasPermission('municipal.authorities.photos.update'))
        "
        type="button"
        class="kt-btn kt-btn-sm kt-btn-outline"
        aria-label="Editar alcaldía"
        :disabled="disabled"
        @click="emit('edit', authority)"
      >
        <i class="ki-filled ki-pencil" aria-hidden="true" />Editar
      </button>
      <AuthorityStateSwitch
        class="ms-auto"
        :municipality-id="municipalityId"
        :authority="authority"
        :writable="writable"
        :disabled="disabled"
        show-label
        @busy="emit('busy', $event)"
        @changed="emit('publicationChanged', $event)"
      />
    </div>
  </article>
</template>
