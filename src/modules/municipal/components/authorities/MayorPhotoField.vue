<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { MunicipalAuthority } from '../../types/authority.types'
import { validateAuthorityPhoto } from '../../utils/authority.photo'
import { fileSize } from '../../utils/municipal.format'
import MayorPhoto from './MayorPhoto.vue'
const props = defineProps<{
  municipalityId: number
  authority?: MunicipalAuthority
  editable: boolean
  disabled: boolean
  active: boolean
}>()
const emit = defineEmits<{
  change: [file: File | null, valid: boolean]
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const candidate = ref<File | null>(null)
const preview = ref<string | null>(null)
const validating = ref(false)
const error = ref('')
const input = ref<HTMLInputElement>()
let selection = 0
function revoke(): void {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
}
function clear(resetInput = true): void {
  selection += 1
  candidate.value = null
  revoke()
  error.value = ''
  if (resetInput && input.value) input.value.value = ''
  validating.value = false
  emit('change', null, true)
  emit('dirty', false)
}
watch(validating, (value) => emit('busy', value), { flush: 'sync' })
async function choose(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement) || props.disabled) return
  const file = event.target.files?.[0]
  clear(false)
  if (!file) return
  const ticket = selection
  candidate.value = file
  validating.value = true
  emit('change', file, false)
  emit('dirty', true)
  try {
    await validateAuthorityPhoto(file)
    if (ticket !== selection) return
    preview.value = URL.createObjectURL(file)
    emit('change', file, true)
  } catch (failure) {
    if (ticket === selection)
      error.value = failure instanceof Error ? failure.message : 'No se pudo leer la imagen.'
  } finally {
    if (ticket === selection) validating.value = false
  }
}
onBeforeUnmount(() => {
  selection += 1
  revoke()
})
defineExpose({ clear })
</script>
<template>
  <div
    class="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3"
    data-mayor-photo-field
  >
    <p class="text-sm font-medium">Fotografía institucional</p>
    <div class="flex min-w-0 flex-wrap items-start gap-3">
      <div class="w-24 shrink-0">
        <img
          v-if="preview"
          :src="preview"
          alt="Vista previa de la fotografía seleccionada"
          class="aspect-square w-full rounded-xl border border-border object-cover"
        />
        <MayorPhoto
          v-else-if="authority"
          :municipality-id="municipalityId"
          :authority="authority"
          :active="active"
        />
        <div
          v-else
          class="flex aspect-square items-center justify-center rounded-xl border border-border bg-background p-2 text-center text-xs text-muted-foreground"
        >
          Fotografía opcional
        </div>
      </div>
      <div v-if="editable" class="flex min-w-0 flex-1 flex-col gap-2">
        <label class="flex flex-col gap-2 text-sm"
          >Seleccionar imagen<input
            ref="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            :disabled="disabled"
            class="kt-input h-auto max-w-full py-2 text-foreground"
            @change="choose"
        /></label>
        <p class="text-xs text-muted-foreground">
          JPG, PNG o WebP. Hasta 5120 KB y 8000 × 8000 píxeles.
        </p>
        <p v-if="candidate" class="break-all text-xs">
          {{ candidate.name }} · {{ fileSize(candidate.size) }}
        </p>
        <button
          v-if="candidate"
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline w-fit text-foreground"
          :disabled="disabled"
          @click="clear()"
        >
          Retirar archivo
        </button>
      </div>
    </div>
    <p v-if="validating" role="status" class="text-xs text-muted-foreground">Validando imagen…</p>
    <p v-if="error" role="alert" class="text-xs text-destructive">{{ error }}</p>
  </div>
</template>
