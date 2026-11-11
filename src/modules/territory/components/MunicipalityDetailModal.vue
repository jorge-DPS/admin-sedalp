<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMunicipality } from '../composables/useMunicipality'

const props = defineProps<{ municipalityId: number }>()
const emit = defineEmits<{ close: [] }>()
const { municipality, loading, error, permitted, reload } = useMunicipality(
  () => props.municipalityId,
)
const dialog = ref<HTMLDialogElement>()
let opener: HTMLElement | null = null
let previousOverflow = ''

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin información'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Sin información'
    : new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(date)
}

const fields = computed(() => [
  { label: 'Código oficial', value: municipality.value?.official_code ?? 'Sin código' },
  { label: 'Provincia', value: municipality.value?.province?.name ?? 'Sin información' },
  { label: 'Región vigente', value: municipality.value?.region?.name ?? 'Sin información' },
  { label: 'Estado', value: municipality.value?.active ? 'Activo' : 'Inactivo' },
  { label: 'Fecha de registro', value: formatDate(municipality.value?.created_at) },
  { label: 'Última actualización', value: formatDate(municipality.value?.updated_at) },
])

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
      class="territory-dialog m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl"
      aria-labelledby="municipality-detail-title"
      @cancel.prevent="emit('close')"
    >
      <div class="flex max-h-[90dvh] flex-col" :aria-busy="loading">
        <header class="flex items-center justify-between gap-3 border-b border-border p-5">
          <h2 id="municipality-detail-title" class="text-lg font-semibold">
            Detalle del municipio
          </h2>
          <button
            type="button"
            class="kt-btn kt-btn-icon kt-btn-ghost"
            aria-label="Cerrar detalle"
            @click="emit('close')"
          >
            <i class="ki-filled ki-cross" aria-hidden="true" />
          </button>
        </header>
        <div class="min-h-0 overflow-y-auto p-5">
          <p v-if="!permitted" role="alert" class="text-sm text-destructive">
            No tienes permiso para consultar este municipio.
          </p>
          <p
            v-else-if="loading"
            role="status"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            Cargando municipio…
          </p>
          <div v-else-if="error" role="alert" class="text-sm text-destructive">
            <p>{{ error.message }}</p>
            <button
              v-if="error.status !== 403 && error.status !== 404"
              class="kt-btn kt-btn-sm kt-btn-outline mt-3 text-foreground"
              type="button"
              @click="reload"
            >
              Reintentar detalle
            </button>
          </div>
          <template v-else-if="municipality">
            <div class="mb-5 flex items-center gap-3">
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <i class="ki-filled ki-geolocation text-xl" aria-hidden="true" />
              </span>
              <h3 class="min-w-0 break-words text-xl font-semibold text-mono">
                {{ municipality.name }}
              </h3>
            </div>
            <dl class="grid gap-5 sm:grid-cols-2">
              <div v-for="field in fields" :key="field.label" class="min-w-0">
                <dt class="text-xs text-muted-foreground">{{ field.label }}</dt>
                <dd class="mt-1 break-words text-sm font-medium">{{ field.value }}</dd>
              </div>
            </dl>
          </template>
        </div>
        <footer class="flex justify-end border-t border-border p-4">
          <button
            class="kt-btn kt-btn-outline text-foreground"
            type="button"
            @click="emit('close')"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.territory-dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}
</style>
