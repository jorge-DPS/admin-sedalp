<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
const props = defineProps<{ title: string; busy?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const id = useId()
let opener: HTMLElement | null = null
let previousOverflow = ''
function close(): void {
  if (!props.busy) emit('close')
}
onMounted(() => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.documentElement.style.overflow = previousOverflow
  if (opener?.isConnected) opener.focus({ preventScroll: true })
})
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="municipal-dialog m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl"
      :aria-labelledby="id"
      @cancel.prevent="close"
      @click.self="close"
    >
      <div class="flex max-h-[90dvh] flex-col" :aria-busy="busy">
        <header class="flex items-center justify-between gap-3 border-b border-border p-5">
          <h2 :id="id" class="text-lg font-semibold">{{ title }}</h2>
          <button
            class="kt-btn kt-btn-icon kt-btn-ghost"
            type="button"
            aria-label="Cerrar ventana"
            :disabled="busy"
            @click="close"
          >
            <i class="ki-filled ki-cross" aria-hidden="true" />
          </button>
        </header>
        <div class="min-h-0 overflow-y-auto p-5"><slot /></div>
      </div>
    </dialog>
  </Teleport>
</template>
<style scoped>
.municipal-dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}
</style>
