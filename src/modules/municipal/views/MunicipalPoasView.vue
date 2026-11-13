<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { Municipality } from '@/modules/territory/types/territory.types'
import type { MunicipalPoa } from '../types/poa.types'
import PoaList from '../components/PoaList.vue'
import PoaForm from '../components/PoaForm.vue'
import PoaDocumentsPanel from '../components/PoaDocumentsPanel.vue'
import MunicipalSidePanel from '../components/MunicipalSidePanel.vue'

const props = defineProps<{ municipalityId: number; municipality: Municipality | null }>()
const emit = defineEmits<{ busy: [boolean]; dirty: [boolean] }>()
const list = ref<InstanceType<typeof PoaList>>()
const sidePanel = ref<InstanceType<typeof MunicipalSidePanel>>()
const documentsSection = ref<HTMLElement>()
const panel = ref<'create' | 'edit' | null>(null)
const editingPoa = shallowRef<MunicipalPoa>()
const selectedPoa = shallowRef<MunicipalPoa>()
const formBusy = ref(false)
const formDirty = ref(false)
const documentsBusy = ref(false)
const documentsDirty = ref(false)
const notice = ref('')
const busy = computed(() => formBusy.value || documentsBusy.value)
const dirty = computed(() => formDirty.value || documentsDirty.value)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
function close(): void {
  panel.value = null
  editingPoa.value = undefined
  formBusy.value = false
  formDirty.value = false
}
function create(): void {
  if (busy.value || dirty.value) return
  editingPoa.value = undefined
  panel.value = 'create'
}
function edit(poa: MunicipalPoa): void {
  if (busy.value || dirty.value) return
  editingPoa.value = poa
  panel.value = 'edit'
}
async function openDocuments(poa: MunicipalPoa): Promise<void> {
  if (busy.value || dirty.value) return
  selectedPoa.value = poa
  await nextTick()
  documentsSection.value?.scrollIntoView({ behavior: 'auto', block: 'start' })
  documentsSection.value?.focus({ preventScroll: true })
}
function saved(poa: MunicipalPoa): void {
  const created = panel.value === 'create'
  selectedPoa.value = poa
  close()
  list.value?.refresh(created ? poa : undefined)
  notice.value = created
    ? 'POA ' + poa.fiscal_year + ' registrado. Ya puedes incorporar sus documentos.'
    : 'Los datos del POA se actualizaron.'
}
function documentsChanged(): void {
  list.value?.refresh()
}
</script>

<template>
  <section class="flex min-w-0 flex-col gap-7">
    <p
      v-if="notice"
      role="status"
      class="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
    >
      {{ notice }}
    </p>
    <PoaList
      ref="list"
      :municipality-id="municipalityId"
      :writable="!!municipality?.active"
      :selected-id="selectedPoa?.id"
      :disabled="busy || dirty"
      @create="create"
      @open="openDocuments"
      @edit="edit"
    />
    <section
      v-if="selectedPoa"
      ref="documentsSection"
      tabindex="-1"
      aria-label="Documentos del POA seleccionado"
      class="scroll-mt-24 border-t border-border pt-6 focus:outline-none"
    >
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-xl font-semibold tracking-tight">POA {{ selectedPoa.fiscal_year }}</h2>
          <p class="mt-1 break-words text-sm text-muted-foreground">
            {{ selectedPoa.title || 'Documentación de la gestión seleccionada' }}
          </p>
        </div>
        <span class="text-sm text-muted-foreground"
          >Municipio: {{ municipality?.name ?? municipalityId }}</span
        >
      </div>
      <PoaDocumentsPanel
        :key="selectedPoa.id"
        :municipality-id="municipalityId"
        :poa="selectedPoa"
        :writable="!!municipality?.active"
        @busy="documentsBusy = $event"
        @dirty="documentsDirty = $event"
        @changed="documentsChanged"
      />
    </section>
    <MunicipalSidePanel
      v-if="panel && municipality"
      ref="sidePanel"
      :title="panel === 'create' ? 'Registrar POA municipal' : 'Editar POA municipal'"
      :description="municipality.name + (editingPoa ? ' · Gestión ' + editingPoa.fiscal_year : '')"
      :busy="formBusy"
      :dirty="formDirty"
      @close="close"
    >
      <PoaForm
        :key="editingPoa?.id ?? 'new'"
        :municipality-id="municipalityId"
        :municipality-name="municipality.name"
        :poa="editingPoa"
        :writable="municipality.active"
        embedded
        @close="sidePanel?.requestClose()"
        @saved="saved"
        @dirty="formDirty = $event"
        @busy="formBusy = $event"
      />
    </MunicipalSidePanel>
  </section>
</template>
