<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAuthorityActions } from '../../composables/useAuthorityActions'
import type { MunicipalAuthority } from '../../types/authority.types'
import MunicipalFeedback from '../MunicipalFeedback.vue'
const props = defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  writable: boolean
  disabled?: boolean
  councilCurrent?: boolean
  showLabel?: boolean
}>()
const emit = defineEmits<{ busy: [value: boolean]; changed: [authority: MunicipalAuthority] }>()
const auth = useAuthStore()
const field = computed(() => (props.councilCurrent ? 'is_current' : 'is_published'))
const label = computed(() => (props.councilCurrent ? 'Vigencia' : 'Publicación'))
const published = ref(props.authority[field.value])
const control = ref<HTMLInputElement>()
const id = useId()
const notice = ref('')
const { busy, error, publish, update } = useAuthorityActions(
  props.municipalityId,
  () => props.writable && props.authority.municipality_id === props.municipalityId,
)
const permitted = computed(
  () =>
    props.writable &&
    (props.councilCurrent
      ? props.authority.role === 'council_member' &&
        auth.hasPermission('municipal.authorities.update')
      : auth.hasPermission('municipal.authorities.publish')),
)
watch(
  () => [props.authority.id, props.authority[field.value]] as const,
  ([, value]) => {
    published.value = value
    error.value = null
  },
  { flush: 'sync' },
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
onBeforeUnmount(() => emit('busy', false))
async function toggle(event: Event): Promise<void> {
  ;(event.currentTarget as HTMLInputElement).checked = published.value
  notice.value = ''
  if (busy.value || props.disabled || !permitted.value) return
  const restore = document.activeElement === control.value
  const saved = props.councilCurrent
    ? await update(props.authority.id, { is_current: !published.value })
    : await publish(props.authority.id, !published.value)
  if (saved) {
    published.value = saved[field.value]
    notice.value = props.councilCurrent
      ? published.value
        ? 'Vigencia activada.'
        : 'Vigencia retirada.'
      : published.value
        ? 'Publicado en el portal.'
        : 'Retirado del portal.'
    emit('changed', saved)
  }
  await nextTick()
  if (restore && control.value?.isConnected) control.value.focus({ preventScroll: true })
}
</script>
<template>
  <div class="flex min-w-0 flex-col gap-2" data-publication-control>
    <div class="flex min-h-9 items-center gap-2">
      <div v-if="showLabel" class="text-right">
        <p class="text-xs text-muted-foreground">Visibilidad en el portal</p>
        <p class="mt-0.5 text-sm font-medium" aria-live="polite">
          {{ busy ? 'Guardando…' : published ? 'Publicado' : 'No publicado' }}
        </p>
      </div>
      <template v-if="permitted">
        <input
          :id="id"
          ref="control"
          type="checkbox"
          class="kt-switch"
          role="switch"
          :checked="published"
          :disabled="busy || disabled"
          :aria-busy="busy"
          :aria-checked="published"
          :title="
            councilCurrent
              ? 'Cambiar vigencia de ' + authority.full_name
              : 'Cambiar visibilidad en el portal de ' + authority.full_name
          "
          @change="toggle"
        />
        <label class="kt-label text-xs" :for="id"
          >{{ label }}<span class="sr-only"> de {{ authority.full_name }}</span></label
        >
      </template>
      <span
        v-else
        class="flex size-10 shrink-0 items-center justify-center rounded-xl"
        :class="
          published
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        "
        :title="published ? 'Publicado en el portal' : 'No publicado'"
        ><i class="ki-filled ki-check-circle text-xl" aria-hidden="true"
      /></span>
    </div>
    <span v-if="notice" role="status" class="text-xs text-muted-foreground">{{ notice }}</span>
    <MunicipalFeedback :error="error" />
  </div>
</template>
