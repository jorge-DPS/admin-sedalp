<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import type { MunicipalAuthority } from '../../types/authority.types'
import { municipalDate } from '../../utils/municipal.format'
import MayorPhoto from './MayorPhoto.vue'
import AuthorityIconButton from './AuthorityIconButton.vue'
import AuthorityStateSwitch from './AuthorityStateSwitch.vue'
const props = defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  writable: boolean
  active: boolean
  embedded?: boolean
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
  <article :class="embedded ? 'min-w-0' : 'kt-card min-w-0 overflow-hidden'">
    <div class="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
      <div class="flex min-w-0 items-start gap-4">
        <div class="w-24 shrink-0 sm:w-32">
          <MayorPhoto :municipality-id="municipalityId" :authority="authority" :active="active" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col items-start gap-2 py-1">
          <h4 class="break-words text-xl font-semibold leading-snug">{{ authority.full_name }}</h4>
          <p class="break-words text-sm text-muted-foreground">
            {{ authority.position_title ?? 'Alcalde o alcaldesa municipal' }}
          </p>
          <span
            class="kt-badge kt-badge-outline mt-1"
            :class="authority.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
            >{{ authority.is_current ? 'Vigente' : 'Histórico' }}</span
          >
        </div>
      </div>
      <dl class="grid gap-5 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div class="min-w-0">
          <dt class="text-xs text-muted-foreground">Inicio del mandato</dt>
          <dd class="mt-1.5 font-semibold">{{ municipalDate(authority.term_start) }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs text-muted-foreground">Finalización del mandato</dt>
          <dd class="mt-1.5 font-semibold">{{ municipalDate(authority.term_end) }}</dd>
        </div>
        <div class="min-w-0 sm:col-span-2">
          <dt class="text-xs text-muted-foreground">Fuente o referencia</dt>
          <dd class="mt-1 whitespace-pre-wrap break-words font-medium leading-relaxed">
            {{ authority.source_reference ?? 'No informada' }}
          </dd>
        </div>
        <div v-if="authority.notes" class="min-w-0 sm:col-span-2">
          <dt class="text-xs text-muted-foreground">Observaciones</dt>
          <dd class="mt-1 whitespace-pre-wrap break-words leading-relaxed">
            {{ authority.notes }}
          </dd>
        </div>
      </dl>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <AuthorityIconButton
          v-if="
            writable &&
            (auth.hasPermission('municipal.authorities.update') ||
              auth.hasPermission('municipal.authorities.photos.update'))
          "
          label="Editar alcalde"
          icon="ki-pencil"
          :disabled="disabled"
          @click="emit('edit', authority)"
        />
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
    </div>
  </article>
</template>
