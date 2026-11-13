<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import type { MunicipalAuthority } from '../../types/authority.types'
import { useAuthorityActions } from '../../composables/useAuthorityActions'
import { authorityDateErrors, municipalToday } from '../../utils/authority.validation'
import { municipalDate } from '../../utils/municipal.format'
import MunicipalFeedback from '../MunicipalFeedback.vue'
const props = defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  previous: MunicipalAuthority
  writable: boolean
}>()
const emit = defineEmits<{
  saved: [authority: MunicipalAuthority]
  cancel: []
  refresh: []
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const { busy, error, transition } = useAuthorityActions(props.municipalityId, () => props.writable)
const id = useId()
const end = ref('')
const confirmed = ref(false)
const dirty = computed(() => Boolean(end.value) || confirmed.value)
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(end, () => {
  confirmed.value = false
})
async function submit(): Promise<void> {
  if (busy.value || !props.writable || !confirmed.value) return
  const errors = authorityDateErrors(props.previous.term_start ?? '', end.value, false)
  Object.assign(
    errors,
    authorityDateErrors(props.authority.term_start ?? '', props.authority.term_end ?? '', true),
  )
  if (
    !end.value ||
    end.value > municipalToday() ||
    !props.authority.term_start ||
    end.value >= props.authority.term_start
  )
    errors.previous_term_end = [
      'El cierre anterior debe ser una fecha no futura, anterior al inicio conocido del nuevo mandato.',
    ]
  if (errors.term_end) {
    errors.previous_term_end = errors.term_end
    delete errors.term_end
  }
  if (Object.keys(errors).length) {
    error.value = { message: 'Revisa las fechas de la transición.', errors, status: 422 }
    return
  }
  const saved = await transition(props.authority.id, {
    previous_authority_id: props.previous.id,
    previous_term_end: end.value,
  })
  if (saved) emit('saved', saved)
}
</script>
<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="rounded-xl border border-border p-4 text-sm">
      <p><strong>Alcalde vigente:</strong> {{ previous.full_name }}</p>
      <p class="mt-2"><strong>Nuevo alcalde:</strong> {{ authority.full_name }}</p>
      <p class="mt-2">Inicio del nuevo mandato: {{ municipalDate(authority.term_start) }}</p>
      <p class="mt-2 text-muted-foreground">
        El registro anterior se conserva. Esta operación no cambia la publicación.
      </p>
    </div>
    <MunicipalFeedback :error="error" />
    <button
      v-if="error"
      type="button"
      class="kt-btn kt-btn-outline w-fit text-foreground"
      :disabled="busy"
      @click="emit('refresh')"
    >
      Actualizar autoridades
    </button>
    <fieldset :disabled="busy || !writable" class="flex flex-col gap-4">
      <label class="flex flex-col gap-2 text-sm font-medium"
        >Finalización del mandato anterior
        <input
          v-model="end"
          required
          type="date"
          :max="municipalToday()"
          class="kt-input text-foreground"
          :aria-invalid="Boolean(error?.errors.previous_term_end)"
          :aria-describedby="error?.errors.previous_term_end ? id + '-end-error' : undefined"
        />
      </label>
      <span
        :id="id + '-end-error'"
        v-if="error?.errors.previous_term_end"
        class="text-xs text-destructive"
        >{{ error.errors.previous_term_end.join(' ') }}</span
      >
      <p v-if="error?.errors.previous_authority_id" class="text-sm text-destructive">
        {{ error.errors.previous_authority_id.join(' ') }}
      </p>
      <label class="flex items-start gap-2 text-sm"
        ><input
          v-model="confirmed"
          type="checkbox"
          required
          class="kt-checkbox mt-0.5 shrink-0"
        />Confirmo el cambio de alcalde vigente y la fecha de cierre del mandato anterior.</label
      >
    </fieldset>
    <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        class="kt-btn kt-btn-outline text-foreground"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="kt-btn kt-btn-primary"
        :disabled="busy || !writable || !confirmed"
      >
        {{ busy ? 'Actualizando…' : 'Confirmar cambio de alcalde' }}
      </button>
    </div>
  </form>
</template>
