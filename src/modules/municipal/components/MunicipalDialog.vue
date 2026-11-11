<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
const props = defineProps<{
  title: string
  busy?: boolean
  inline?: boolean
  size?: 'normal' | 'wide'
}>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement>()
const id = useId()
let opener: HTMLElement | null = null
let previousOverflow = ''
let opened = false
function close(): void {
  if (!props.busy) emit('close')
}
function handleEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !opened) return
  const topDialog = [...document.querySelectorAll('dialog[open]')].at(-1)
  if (topDialog !== dialog.value) return
  event.preventDefault()
  event.stopImmediatePropagation()
  close()
}
onMounted(() => {
  if (props.inline || !(dialog.value instanceof HTMLDialogElement)) return
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  dialog.value.showModal()
  opened = true
  document.addEventListener('keydown', handleEscape, true)
})
onBeforeUnmount(() => {
  if (!opened) return
  document.removeEventListener('keydown', handleEscape, true)
  if (dialog.value instanceof HTMLDialogElement) dialog.value.close()
  document.documentElement.style.overflow = previousOverflow
  if (opener?.isConnected) opener.focus({ preventScroll: true })
})
</script>
<template>
  <Teleport to="body" :disabled="inline">
    <component
      :is="inline ? 'section' : 'dialog'"
      ref="dialog"
      :aria-labelledby="id"
      :class="
        inline
          ? 'w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background text-foreground'
          : [
              'municipal-dialog m-auto w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl',
              size === 'wide' ? 'max-w-6xl' : 'max-w-2xl',
            ]
      "
      @cancel.prevent="close"
      @click.self="!inline && close()"
    >
      <div class="flex min-w-0 flex-col" :class="inline ? '' : 'max-h-[90dvh]'" :aria-busy="busy">
        <header
          class="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:p-5"
        >
          <div class="min-w-0">
            <h2 :id="id" class="break-words text-lg font-semibold">{{ title }}</h2>
            <slot name="description" />
          </div>
          <button
            class="kt-btn kt-btn-icon kt-btn-ghost shrink-0"
            type="button"
            :aria-label="inline ? 'Volver' : 'Cerrar ventana'"
            :disabled="busy"
            @click="close"
          >
            <i
              class="ki-filled"
              :class="inline ? 'ki-arrow-left' : 'ki-cross'"
              aria-hidden="true"
            />
          </button>
        </header>
        <div class="min-w-0 p-4 sm:p-5" :class="inline ? '' : 'min-h-0 overflow-y-auto'">
          <slot />
        </div>
      </div>
    </component>
  </Teleport>
</template>
<style scoped>
.municipal-dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}
</style>
