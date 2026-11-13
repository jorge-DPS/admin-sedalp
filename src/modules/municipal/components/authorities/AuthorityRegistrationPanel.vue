<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue'
import type { MunicipalAuthority, MunicipalAuthorityRole } from '../../types/authority.types'
import { authoritiesApi } from '../../api/authorities.api'
import { useMunicipalQuery } from '../../composables/useMunicipalQuery'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import AuthorityForm from './AuthorityForm.vue'
import type { MunicipalTerm } from '../../types/term.types'
const props = defineProps<{
  municipalityId: number
  termId?: number
  terms?: MunicipalTerm[]
  role: MunicipalAuthorityRole
  currentMayor: MunicipalAuthority | null
  currentKnown: boolean
  writable: boolean
  disabled: boolean
  active: boolean
  canCreate: boolean
  embedded?: boolean
}>()
const emit = defineEmits<{
  saved: [authority: MunicipalAuthority]
  persisted: [authority: MunicipalAuthority]
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const expanded = ref(false)
const visited = ref(false)
const busy = ref(false)
const dirty = ref(false)
const confirmDiscard = ref(false)
const generation = ref(0)
const selectedId = ref<number | null>(null)
const draftAuthority = shallowRef<MunicipalAuthority>()
const trigger = ref<HTMLButtonElement>()
const container = ref<HTMLElement>()
const id = useId()
let pending: (() => void) | null = null
const { data, loading, error, reload } = useMunicipalQuery(
  'municipal.authorities.view',
  () => [selectedId.value, props.municipalityId],
  (signal) =>
    selectedId.value === null
      ? null
      : authoritiesApi.show(props.municipalityId, selectedId.value, signal).then((authority) => {
          if (authority.municipality_id !== props.municipalityId || authority.role !== props.role)
            throw new Error('La autoridad no corresponde al municipio o cargo seleccionado.')
          return authority
        }),
)
const authority = computed(
  () => draftAuthority.value ?? (data.value?.id === selectedId.value ? data.value : undefined),
)
const title = computed(
  () =>
    (selectedId.value !== null || authority.value || !props.canCreate ? 'Editar ' : 'Registrar ') +
    (props.role === 'mayor' ? 'alcalde o alcaldesa' : 'concejal'),
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(
  dirty,
  (value) => {
    emit('dirty', value)
    if (!value) confirmDiscard.value = false
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
function toggle(): void {
  if (props.disabled || busy.value) return
  expanded.value = !expanded.value
  if (expanded.value) visited.value = true
}
function protect(operation: () => void): void {
  if (props.disabled || busy.value) return
  if (dirty.value) {
    pending = operation
    confirmDiscard.value = true
    expanded.value = true
    return
  }
  operation()
}
function reset(): void {
  dirty.value = false
  confirmDiscard.value = false
  selectedId.value = null
  draftAuthority.value = undefined
  expanded.value = false
  generation.value += 1
  pending = null
  void nextTick(() => trigger.value?.focus({ preventScroll: true }))
}
function discard(): void {
  if (busy.value || props.disabled) return
  const operation = pending
  pending = null
  dirty.value = false
  confirmDiscard.value = false
  operation?.()
}
function cancel(): void {
  protect(reset)
}
function startNew(): void {
  if (!props.canCreate) return
  protect(() => {
    reset()
    expanded.value = true
    visited.value = true
  })
}
async function edit(authority: MunicipalAuthority): Promise<void> {
  if (
    authority.municipality_id !== props.municipalityId ||
    authority.role !== props.role ||
    props.disabled ||
    busy.value
  )
    return
  if (selectedId.value === authority.id || draftAuthority.value?.id === authority.id) {
    expanded.value = true
    await nextTick()
    trigger.value?.focus()
    return
  }
  protect(() => {
    draftAuthority.value = undefined
    selectedId.value = authority.id
    generation.value += 1
    visited.value = true
    expanded.value = true
  })
  await nextTick()
  container.value?.scrollIntoView({ block: 'nearest' })
  trigger.value?.focus({ preventScroll: true })
}
function persisted(authority: MunicipalAuthority): void {
  draftAuthority.value = authority
  emit('persisted', authority)
}
function saved(authority: MunicipalAuthority): void {
  reset()
  emit('saved', authority)
}
defineExpose({ edit })
</script>
<template>
  <section
    ref="container"
    :class="embedded ? 'min-w-0 border-t border-border' : 'kt-card min-w-0 overflow-hidden'"
    :aria-label="title"
    :data-authority-role="role"
    data-registration-panel
  >
    <h3>
      <button
        :id="id + '-trigger'"
        ref="trigger"
        type="button"
        :aria-label="title"
        :aria-expanded="expanded"
        :aria-controls="id + '-body'"
        :disabled="disabled || busy"
        class="flex w-full items-center justify-between gap-4 p-4 text-left text-foreground transition-colors hover:bg-muted/35 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring disabled:cursor-wait sm:p-5"
        @click="toggle"
      >
        <span class="flex min-w-0 flex-col gap-1"
          ><span class="text-base font-semibold">{{ title }}</span
          ><span v-if="dirty && !expanded" class="text-xs font-normal text-muted-foreground"
            >Cambios sin guardar</span
          ></span
        ><i
          class="ki-filled shrink-0 text-lg text-muted-foreground"
          :class="expanded ? 'ki-up' : 'ki-down'"
          aria-hidden="true"
        />
      </button>
    </h3>
    <div :id="id + '-body'" v-show="expanded" class="border-t border-border p-4 sm:p-5">
      <div
        v-if="confirmDiscard"
        role="alert"
        class="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm"
      >
        <p>Hay cambios sin guardar en este formulario.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="kt-btn kt-btn-sm kt-btn-primary"
            :disabled="busy"
            @click="confirmDiscard = false"
          >
            Continuar editando</button
          ><button
            type="button"
            class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
            :disabled="busy"
            @click="discard"
          >
            Descartar formulario
          </button>
        </div>
      </div>
      <div v-if="authority && canCreate" class="mb-4 flex justify-end">
        <button
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
          :disabled="disabled || busy"
          @click="startNew"
        >
          {{ role === 'mayor' ? 'Nuevo alcalde' : 'Nuevo concejal' }}
        </button>
      </div>
      <p v-if="selectedId !== null && loading" role="status" class="text-sm text-muted-foreground">
        Cargando autoridad…
      </p>
      <MunicipalFeedback v-if="selectedId !== null" :error="error" retry @retry="reload" />
      <AuthorityForm
        v-if="visited && (authority || (selectedId === null && canCreate))"
        :key="generation"
        :municipality-id="municipalityId"
        :term-id="termId"
        :terms="terms ?? []"
        :role="role"
        :authority="authority"
        :current-mayor="currentMayor"
        :current-known="currentKnown"
        :writable="writable && (!disabled || busy)"
        :active="active && expanded"
        @busy="busy = $event"
        @dirty="dirty = $event"
        @cancel="cancel"
        @persisted="persisted"
        @saved="saved"
      />
      <p v-else-if="selectedId === null && !canCreate" class="text-sm text-muted-foreground">
        Selecciona el icono de edición de un registro existente.
      </p>
    </div>
  </section>
</template>
