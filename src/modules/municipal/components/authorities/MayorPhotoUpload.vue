<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { MunicipalAuthority } from '../../types/authority.types'
import { useAuthorityActions } from '../../composables/useAuthorityActions'
import { fileSize } from '../../utils/municipal.format'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import { validateAuthorityPhoto } from '../../utils/authority.photo'
const props = defineProps<{
  municipalityId: number
  authority: MunicipalAuthority
  writable: boolean
}>()
const emit = defineEmits<{
  saved: [authority: MunicipalAuthority]
  cancel: []
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const { busy, error, progress, uploadPhoto } = useAuthorityActions(
  props.municipalityId,
  () => props.writable,
)
const file = ref<File | null>(null)
const preview = ref<string | null>(null)
const input = ref<HTMLInputElement>()
const validating = ref(false)
const working = computed(() => busy.value || validating.value)
let selection = 0
function clearPreview(): void {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
}
function remove(): void {
  selection += 1
  file.value = null
  clearPreview()
  if (input.value) input.value.value = ''
  error.value = null
  validating.value = false
}
watch(working, (value) => emit('busy', value), { flush: 'sync' })
watch(file, (value) => emit('dirty', value !== null), { immediate: true, flush: 'sync' })
async function choose(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) return
  const candidate = event.target.files?.[0]
  remove()
  if (!candidate) return
  const ticket = selection
  validating.value = true
  file.value = candidate
  try {
    await validateAuthorityPhoto(candidate)
    if (ticket !== selection) return
    preview.value = URL.createObjectURL(candidate)
  } catch (failure) {
    if (ticket !== selection) return
    remove()
    error.value = {
      message: failure instanceof Error ? failure.message : 'No se pudo leer la imagen.',
      errors: {},
      status: null,
    }
  } finally {
    if (ticket === selection) validating.value = false
  }
}
async function submit(): Promise<void> {
  if (
    !file.value ||
    !preview.value ||
    working.value ||
    !props.writable ||
    props.authority.role !== 'mayor'
  )
    return
  const saved = await uploadPhoto(props.authority, file.value)
  if (saved) {
    remove()
    emit('saved', saved)
  }
}
onBeforeUnmount(() => {
  selection += 1
  clearPreview()
})
</script>
<template>
  <form class="flex min-w-0 flex-col gap-4" @submit.prevent="submit">
    <p class="text-sm text-muted-foreground">
      {{ authority.full_name }} · Fotografía institucional. Laravel procesa y almacena la imagen de
      forma privada.
    </p>
    <MunicipalFeedback :error="error" />
    <fieldset :disabled="working || !writable" class="flex min-w-0 flex-col gap-4">
      <label class="flex flex-col gap-2 text-sm font-medium"
        >Fotografía del alcalde o alcaldesa
        <input
          ref="input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          class="kt-input h-auto py-2 text-foreground"
          @change="choose"
        />
      </label>
      <p class="text-xs text-muted-foreground">
        JPG, JPEG, PNG o WebP. Hasta 5120 KB y 8000 × 8000 píxeles; el servidor confirma los
        límites.
      </p>
      <div v-if="file" class="flex flex-col items-start gap-3">
        <p class="max-w-full break-all text-sm">{{ file.name }} · {{ fileSize(file.size) }}</p>
        <img
          v-if="preview"
          :src="preview"
          alt="Vista previa de la fotografía seleccionada"
          class="aspect-square w-48 max-w-full rounded-xl border border-border object-cover"
        />
        <button
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
          @click="remove"
        >
          Retirar archivo
        </button>
      </div>
    </fieldset>
    <p v-if="validating" role="status" class="text-sm">Validando imagen…</p>
    <progress
      v-if="busy && progress !== null"
      :value="progress"
      max="100"
      class="w-full"
      aria-label="Progreso de subida de fotografía"
    />
    <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        class="kt-btn kt-btn-outline text-foreground"
        :disabled="working"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="kt-btn kt-btn-primary"
        :disabled="working || !file || !preview || !writable"
      >
        {{ busy ? 'Subiendo…' : 'Guardar fotografía' }}
      </button>
    </div>
  </form>
</template>
