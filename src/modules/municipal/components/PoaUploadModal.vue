<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { usePoaDocumentActions } from '../composables/usePoaActions'
import { fileSize } from '../utils/municipal.format'
import type { PoaDocument } from '../types/poa.types'
import MunicipalDialog from './MunicipalDialog.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'

const props = defineProps<{ municipalityId: number; poaId: number; fiscalYear: number }>()
const emit = defineEmits<{ close: []; saved: [document: PoaDocument]; busy: [value: boolean] }>()
const { busy, error, progress, upload } = usePoaDocumentActions(props.municipalityId, props.poaId)
const file = ref<File | null>(null)
const input = ref<HTMLInputElement>()
const form = reactive({ title: '', document_reference: '', received_at: '', notes: '' })
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
function choose(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  file.value = event.target.files?.[0] ?? null
  error.value = null
}
function remove(): void {
  file.value = null
  if (input.value) input.value.value = ''
  error.value = null
}
async function submit(): Promise<void> {
  if (!file.value || busy.value) return
  const saved = await upload({ ...form, pdf: file.value })
  if (saved) {
    remove()
    emit('saved', saved)
  }
}
</script>
<template>
  <MunicipalDialog title="Subir nueva versión PDF" :busy="busy" @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <p class="text-sm text-muted-foreground">
        POA {{ fiscalYear }}. Cada carga conserva un archivo independiente. Laravel asigna el número
        y el tipo de versión; subir no publica el documento.
      </p>
      <MunicipalFeedback :error="error" />
      <fieldset :disabled="busy" class="flex min-w-0 flex-col gap-4">
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
          Solo archivos PDF. El límite de tamaño depende de la configuración del servidor.
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
        {{
          progress === 100
            ? 'Archivo enviado; el servidor está validando y registrando la versión…'
            : progress === null
              ? 'Validando y enviando PDF…'
              : `Enviando PDF: ${progress}%`
        }}
      </div>
      <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button
          class="kt-btn kt-btn-outline text-foreground"
          type="button"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button class="kt-btn kt-btn-primary" type="submit" :disabled="busy || !file">
          {{ busy ? 'Procesando…' : 'Registrar versión PDF' }}
        </button>
      </div>
    </form>
  </MunicipalDialog>
</template>
