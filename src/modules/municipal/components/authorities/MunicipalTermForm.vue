<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { termsApi } from '../../api/terms.api'
import { useMunicipalMutation } from '../../composables/usePoaActions'
import type { MunicipalTerm } from '../../types/term.types'
import MunicipalFeedback from '../MunicipalFeedback.vue'
const props = defineProps<{ municipalityId: number; term?: MunicipalTerm; writable: boolean }>()
const emit = defineEmits<{ saved: [MunicipalTerm]; close: []; busy: [boolean]; dirty: [boolean] }>()
const form = reactive({
  start_year: props.term?.start_year ?? new Date().getFullYear(),
  end_year: props.term?.end_year ?? new Date().getFullYear() + 5,
})
const initial = JSON.stringify(form)
const dirty = computed(() => JSON.stringify(form) !== initial)
const locked = computed(() => (props.term?.authorities_count ?? 0) > 0)
const { busy, error, run } = useMunicipalMutation()
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
async function submit() {
  if (busy.value || !props.writable || locked.value) return
  if (form.end_year <= form.start_year) {
    error.value = {
      status: 422,
      message: 'Revisa el período de la gestión.',
      errors: { end_year: ['El año final debe ser posterior al inicial.'] },
    }
    return
  }
  const saved = await run(() =>
    props.term
      ? termsApi.update(props.municipalityId, props.term.id, form)
      : termsApi.create(props.municipalityId, form),
  )
  if (saved) emit('saved', saved)
}
</script>
<template>
  <form class="flex flex-col gap-5" @submit.prevent="submit">
    <MunicipalFeedback :error="error" />
    <p class="text-sm leading-relaxed text-muted-foreground">
      La gestión agrupa alcaldes y concejales del mismo municipio. Las fechas de sus mandatos se
      registran por separado.
    </p>
    <p v-if="locked" role="status" class="rounded-lg border border-border bg-muted/40 p-4 text-sm">
      Este período está protegido porque ya tiene autoridades. Crea otra gestión para registrar un
      período diferente.
    </p>
    <fieldset class="grid gap-4 sm:grid-cols-2" :disabled="busy || !writable || locked">
      <label class="flex flex-col gap-2 text-sm font-medium"
        >Año inicial<input
          v-model.number="form.start_year"
          class="kt-input w-full text-foreground"
          type="number"
          min="1900"
          max="2100"
          required
      /></label>
      <label class="flex flex-col gap-2 text-sm font-medium"
        >Año final<input
          v-model.number="form.end_year"
          class="kt-input w-full text-foreground"
          type="number"
          min="1900"
          max="2100"
          required
      /></label>
    </fieldset>
    <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        class="kt-btn kt-btn-outline text-foreground"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar</button
      ><button
        v-if="!locked"
        type="submit"
        class="kt-btn kt-btn-primary"
        :disabled="busy || !writable"
      >
        {{ busy ? 'Guardando…' : 'Guardar gestión' }}
      </button>
    </div>
  </form>
</template>
