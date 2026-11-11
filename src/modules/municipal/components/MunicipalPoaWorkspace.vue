<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import type { Municipality } from '@/modules/territory/types/territory.types'
import type { MunicipalPoa } from '../types/poa.types'
import PoaList from './PoaList.vue'
import PoaFormModal from './PoaFormModal.vue'
import PoaDocumentsPanel from './PoaDocumentsPanel.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'
const props = defineProps<{ municipalityId: number; municipality: Municipality | null }>()
const emit = defineEmits<{ busy: [value: boolean]; dirty: [value: boolean] }>()
const auth = useAuthStore()
const list = ref<InstanceType<typeof PoaList>>()
const mode = ref<'list' | 'form' | 'documents'>('list')
const editing = shallowRef<MunicipalPoa>()
const selectedId = ref<number | null>(null)
const busy = ref(false)
const documentDirty = ref(false)
const notice = ref('')
const dirty = computed(() => mode.value === 'form' || documentDirty.value)
const writable = computed(
  () => props.municipality?.id === props.municipalityId && props.municipality.active === true,
)
const {
  data: selectedPoa,
  loading,
  error,
  reload,
} = useMunicipalQuery(
  'municipal.poas.view',
  () => [mode.value, selectedId.value, props.municipalityId],
  (signal) =>
    mode.value === 'documents' && selectedId.value !== null
      ? poasApi.show(props.municipalityId, selectedId.value, signal)
      : null,
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
function create(): void {
  if (!writable.value || !auth.hasPermission('municipal.poas.create')) return
  editing.value = undefined
  mode.value = 'form'
}
function edit(poa: MunicipalPoa): void {
  if (!writable.value || !auth.hasPermission('municipal.poas.update')) return
  editing.value = poa
  mode.value = 'form'
}
function open(poa: MunicipalPoa): void {
  selectedId.value = poa.id
  mode.value = 'documents'
}
function saved(poa: MunicipalPoa): void {
  mode.value = 'list'
  notice.value = `POA ${poa.fiscal_year} guardado.`
  list.value?.refresh(poa)
}
function back(): void {
  if (!busy.value && !documentDirty.value) mode.value = 'list'
}
</script>
<template>
  <div class="flex min-w-0 flex-col gap-4">
    <p
      v-if="!writable"
      role="status"
      class="rounded-xl border border-border p-4 text-sm text-muted-foreground"
    >
      {{
        municipality?.active === false
          ? 'Municipio inactivo: solo consulta y descarga.'
          : 'Solo consulta hasta confirmar que el municipio existe y está activo.'
      }}
    </p>
    <p
      v-if="notice"
      role="status"
      class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm"
    >
      {{ notice }}
    </p>
    <PoaList
      ref="list"
      v-show="mode === 'list'"
      :municipality-id="municipalityId"
      :writable="writable"
      @create="create"
      @edit="edit"
      @open="open"
    />
    <PoaFormModal
      v-if="mode === 'form'"
      inline
      :municipality-id="municipalityId"
      :municipality-name="municipality?.name ?? `Municipio #${municipalityId}`"
      :poa="editing"
      :writable="writable"
      @busy="busy = $event"
      @close="mode = 'list'"
      @saved="saved"
    />
    <template v-if="mode === 'documents'">
      <button
        class="kt-btn kt-btn-outline w-fit text-foreground"
        type="button"
        :disabled="busy || documentDirty"
        @click="back"
      >
        Volver al listado de POA
      </button>
      <p v-if="loading" role="status">Cargando POA…</p>
      <MunicipalFeedback :error="error" retry @retry="reload" />
      <template v-if="selectedPoa">
        <div class="rounded-xl border border-border p-4">
          <h3 class="text-lg font-semibold">POA {{ selectedPoa.fiscal_year }}</h3>
          <p v-if="selectedPoa.title" class="mt-1 font-medium">{{ selectedPoa.title }}</p>
          <p class="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {{ selectedPoa.notes ?? 'Sin observaciones' }}
          </p>
        </div>
        <PoaDocumentsPanel
          :key="selectedPoa.id"
          inline
          :municipality-id="municipalityId"
          :poa="selectedPoa"
          :writable="writable"
          @busy="busy = $event"
          @dirty="documentDirty = $event"
          @changed="list?.refresh()"
        />
      </template>
    </template>
  </div>
</template>
