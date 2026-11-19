<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { Municipality } from '@/modules/territory/types/territory.types'
import type { MunicipalPoa } from '../types/poa.types'
import PoaList from '../components/PoaList.vue'
import PoaForm from '../components/PoaForm.vue'
import MunicipalFormDialog from '../components/MunicipalFormDialog.vue'

defineProps<{ municipalityId: number; municipality: Municipality | null }>()
const emit = defineEmits<{ busy: [boolean]; dirty: [boolean] }>()
const editing = shallowRef<MunicipalPoa | 'new' | null>(null)
const savedRecord = shallowRef<{ poaId: number; created: boolean }>()
const editor = ref<InstanceType<typeof MunicipalFormDialog>>()
const busy = ref(false)
const dirty = ref(false)

watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})

function close() {
  busy.value = false
  dirty.value = false
  editing.value = null
}

function saved(poa: MunicipalPoa) {
  savedRecord.value = { poaId: poa.id, created: editing.value === 'new' }
  close()
}
</script>

<template>
  <PoaList
    :municipality-id="municipalityId"
    :writable="!!municipality?.active"
    :saved="savedRecord"
    @create="editing = 'new'"
    @edit="editing = $event"
  />
  <MunicipalFormDialog
    v-if="editing && municipality"
    ref="editor"
    :title="editing === 'new' ? 'Registrar POA municipal' : 'Editar POA municipal'"
    :busy="busy"
    :dirty="dirty"
    @close="close"
  >
    <PoaForm
      :municipality-id="municipalityId"
      :municipality-name="municipality.name"
      :poa="editing === 'new' ? undefined : editing"
      :writable="municipality.active"
      embedded
      @close="editor?.requestClose()"
      @saved="saved"
      @dirty="dirty = $event"
      @busy="busy = $event"
    />
  </MunicipalFormDialog>
</template>
