<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { usePoaUpload } from '../composables/usePoaUpload'
import { fileSize } from '../utils/municipal.format'
import type { PoaVersionDocument } from '../types/poa.types'
import MunicipalSection from './MunicipalSection.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'

const props = defineProps<{
  municipalityId: number
  poaId: number
  versionId: number
  versionNumber: number
  fiscalYear: number
  writable: boolean
  embedded?: boolean
}>()
const emit = defineEmits<{
  close: []
  saved: [document: PoaVersionDocument]
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const { busy, error, progress, upload, message, session, pause, discard } = usePoaUpload(
  props.municipalityId,
  props.poaId,
  props.versionId,
  () => props.writable,
)
defineExpose({ discard })
const file = ref<File | null>(null)
const input = ref<HTMLInputElement>()
const form = reactive({ title: '', document_reference: '', received_at: '', notes: '' })
const dirty = computed(
  () => file.value !== null || Object.values(form).some((value) => value !== ''),
)
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
function choose(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  file.value = event.target.files?.[0] ?? null
  error.value = null
}
async function remove(): Promise<void> {
  if (!(await discard())) return
  file.value = null
  if (input.value) input.value.value = ''
  error.value = null
}
async function submit(): Promise<void> {
  if (!file.value || busy.value || !props.writable) return
  const saved = await upload({ ...form, pdf: file.value })
  if (saved) {
    file.value = null
    if (input.value) input.value.value = ''
    emit('saved', saved)
  }
}
</script>
<template>
  <MunicipalSection title="Adjuntar PDF a la versión" :busy="busy" :embedded="embedded">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <p class="text-sm text-muted-foreground">
        POA {{ fiscalYear }} · Versión {{ versionNumber }}. Puedes adjuntar varios PDF al mismo
        borrador. Se publicarán juntos al publicar la versión completa.
      </p>
      <MunicipalFeedback :error="error" />
      <fieldset :disabled="busy || !writable || !!session" class="flex min-w-0 flex-col gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Documento PDF
          <input
            ref="input"
            type="file"
            accept=".pdf,application/pdf"
            :required="!file"
            class="kt-input h-auto w-full py-3 text-foreground"
            @change="choose"
          />
        </label>
        <div
          v-if="file"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
        >
          <span class="min-w-0 break-all">{{ file.name }} · {{ fileSize(file.size) }}</span>
          <button
            class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
            type="button"
            @click="remove"
          >
            Retirar archivo
          </button>
        </div>
        <p class="text-xs text-muted-foreground">
          Solo archivos PDF. Los archivos grandes se envían por partes y puedes reanudar su carga.
          El límite lo determina el servidor.
        </p>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Título del documento
          <input v-model="form.title" class="kt-input text-foreground" maxlength="255" required />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Referencia documental (opcional)
          <input
            v-model="form.document_reference"
            class="kt-input text-foreground"
            maxlength="255"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Fecha de recepción (opcional)
          <input v-model="form.received_at" type="date" class="kt-input text-foreground" />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Observaciones (opcional)
          <textarea v-model="form.notes" class="kt-input min-h-24 py-3 text-foreground" rows="3" />
        </label>
      </fieldset>
      <div v-if="busy" role="status" class="text-sm">
        <progress
          v-if="progress !== null"
          :value="progress"
          max="100"
          class="w-full accent-primary"
          aria-label="Progreso de carga"
        />
        {{ message }}
      </div>
      <p v-if="!busy && message" role="status" class="text-sm text-muted-foreground">
        {{ message }}
      </p>
      <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button
          v-if="busy && (file?.size ?? 0) > 16 * 1024 * 1024"
          type="button"
          class="kt-btn kt-btn-outline text-foreground"
          @click="pause"
        >
          Pausar carga
        </button>
        <button
          class="kt-btn kt-btn-outline text-foreground"
          type="button"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button class="kt-btn kt-btn-primary" type="submit" :disabled="busy || !file || !writable">
          {{ busy ? 'Procesando…' : session ? 'Reanudar carga' : 'Adjuntar PDF' }}
        </button>
      </div>
    </form>
  </MunicipalSection>
</template>
