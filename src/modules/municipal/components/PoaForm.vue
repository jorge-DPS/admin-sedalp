<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { MunicipalPoa } from '../types/poa.types'
import { usePoaActions } from '../composables/usePoaActions'
import MunicipalSection from './MunicipalSection.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'

const props = defineProps<{
  municipalityId: number
  municipalityName: string
  poa?: MunicipalPoa
  writable: boolean
  embedded?: boolean
}>()
const emit = defineEmits<{
  close: []
  saved: [poa: MunicipalPoa]
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const { busy, error, create, update } = usePoaActions(props.municipalityId)
const form = reactive({
  fiscal_year:
    props.poa?.fiscal_year ??
    Number(
      new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/La_Paz' }).format(
        new Date(),
      ),
    ),
  title: props.poa?.title ?? '',
  notes: props.poa?.notes ?? '',
})
const initialForm = JSON.stringify(form)
const dirty = computed(() => JSON.stringify(form) !== initialForm)
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
async function submit(): Promise<void> {
  if (busy.value || !props.writable) return
  const fields = { title: form.title.trim() || null, notes: form.notes.trim() || null }
  const saved = props.poa
    ? await update(props.poa.id, fields)
    : await create({ ...fields, fiscal_year: Number(form.fiscal_year) })
  if (saved) emit('saved', saved)
}
</script>
<template>
  <MunicipalSection
    :title="poa ? 'Editar POA municipal' : 'Registrar POA municipal'"
    :busy="busy"
    :embedded="embedded"
  >
    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <MunicipalFeedback :error="error" />
      <fieldset :disabled="busy || !writable" class="flex min-w-0 flex-col gap-4">
        <div class="grid items-start gap-4 rounded-lg bg-muted/25 p-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground">Municipio</p>
            <p class="mt-1 break-words font-medium">{{ municipalityName }}</p>
          </div>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Gestión fiscal
            <input
              v-model="form.fiscal_year"
              name="fiscal_year"
              type="number"
              min="1900"
              max="2100"
              step="1"
              required
              class="kt-input text-foreground"
              :disabled="Boolean(poa)"
              :aria-invalid="Boolean(error?.errors.fiscal_year)"
            />
          </label>
        </div>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Título (opcional)
          <input
            v-model="form.title"
            name="title"
            class="kt-input text-foreground"
            maxlength="255"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Observaciones (opcional)
          <textarea
            v-model="form.notes"
            name="notes"
            class="kt-input min-h-28 py-3 text-foreground"
            rows="4"
          />
        </label>
      </fieldset>
      <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button
          class="kt-btn kt-btn-outline text-foreground"
          type="button"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button class="kt-btn kt-btn-primary" type="submit" :disabled="busy || !writable">
          {{ busy ? 'Guardando…' : 'Guardar POA' }}
        </button>
      </div>
    </form>
  </MunicipalSection>
</template>
