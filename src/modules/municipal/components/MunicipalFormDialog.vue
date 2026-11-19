<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  wide?: boolean
  busy?: boolean
  dirty?: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const heading = ref<HTMLElement>()
const keepEditing = ref<HTMLButtonElement>()
const discard = ref(false)
const id = useId()
const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
let previousOverflow = ''

function requestClose() {
  if (props.busy) return
  if (!props.dirty) {
    emit('close')
    return
  }
  discard.value = true
  void nextTick(() => keepEditing.value?.focus())
}

function continueEditing() {
  discard.value = false
  heading.value?.focus()
}

watch(
  () => props.dirty,
  (value) => {
    if (!value) discard.value = false
  },
)
onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
  heading.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
  void nextTick(() => previousFocus?.focus({ preventScroll: true }))
})
defineExpose({ requestClose })
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] flex-col overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/35 open:flex"
      :class="wide ? 'max-w-2xl' : 'max-w-lg'"
      :aria-labelledby="id"
      :aria-describedby="description ? id + '-description' : undefined"
      :aria-busy="busy"
      @cancel.prevent="requestClose"
    >
      <header
        class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5"
      >
        <div class="min-w-0">
          <h2
            :id="id"
            ref="heading"
            tabindex="-1"
            class="break-words text-lg font-semibold tracking-tight"
          >
            {{ title }}
          </h2>
          <p
            v-if="description"
            :id="id + '-description'"
            class="mt-1 break-words text-sm text-muted-foreground"
          >
            {{ description }}
          </p>
        </div>
        <button
          type="button"
          class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost shrink-0"
          aria-label="Cerrar ventana"
          :disabled="busy"
          @click="requestClose"
        >
          <i class="ki-filled ki-cross" aria-hidden="true" />
        </button>
      </header>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <div v-if="discard" role="alert" class="rounded-lg border border-border bg-muted/40 p-3">
          <p class="text-sm font-medium">Tienes cambios sin guardar</p>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <button
              ref="keepEditing"
              type="button"
              class="kt-btn kt-btn-sm kt-btn-outline"
              @click="continueEditing"
            >
              Seguir editando
            </button>
            <button
              type="button"
              class="kt-btn kt-btn-sm kt-btn-destructive"
              :disabled="busy"
              @click="emit('close')"
            >
              Descartar cambios
            </button>
          </div>
        </div>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>
