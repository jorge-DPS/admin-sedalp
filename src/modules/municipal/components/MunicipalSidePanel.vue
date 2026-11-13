<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  busy?: boolean
  dirty?: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const discard = ref(false)
const id = useId()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''

function requestClose(): void {
  if (props.busy) return
  if (props.dirty) {
    discard.value = true
    return
  }
  emit('close')
}
function discardChanges(): void {
  if (!props.busy) emit('close')
}
watch(
  () => props.dirty,
  (value) => {
    if (!value) discard.value = false
  },
)
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
  await nextTick()
  dialog.value
    ?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
    )
    ?.focus()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
  previousFocus?.focus({ preventScroll: true })
})
defineExpose({ requestClose })
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="m-0 ml-auto flex h-dvh max-h-dvh w-full max-w-none flex-col border-0 border-l border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/25 sm:max-w-md"
      :aria-labelledby="id"
      :aria-describedby="description ? id + '-description' : undefined"
      :aria-busy="busy"
      @cancel.prevent="requestClose"
      @click.self="requestClose"
    >
      <header
        class="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5"
      >
        <div class="min-w-0">
          <h2 :id="id" class="text-lg font-semibold tracking-tight">{{ title }}</h2>
          <p
            v-if="description"
            :id="id + '-description'"
            class="mt-1 text-sm leading-6 text-muted-foreground"
          >
            {{ description }}
          </p>
        </div>
        <button
          class="kt-btn kt-btn-icon kt-btn-ghost shrink-0 text-muted-foreground"
          type="button"
          aria-label="Cerrar panel"
          :disabled="busy"
          @click="requestClose"
        >
          <i class="ki-filled ki-cross" aria-hidden="true" />
        </button>
      </header>
      <div
        v-if="discard"
        role="alert"
        class="mx-6 mt-5 rounded-lg border border-border bg-muted/50 p-4"
      >
        <p class="text-sm font-medium">Tienes cambios sin guardar</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Si cierras el panel, se perderán los datos de este formulario.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="kt-btn kt-btn-sm kt-btn-primary" @click="discard = false">
            Seguir editando
          </button>
          <button
            type="button"
            class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
            :disabled="busy"
            @click="discardChanges"
          >
            Descartar y cerrar
          </button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"><slot /></div>
    </dialog>
  </Teleport>
</template>
