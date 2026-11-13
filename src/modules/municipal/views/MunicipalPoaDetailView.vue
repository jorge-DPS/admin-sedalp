<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Municipality } from '@/modules/territory/types/territory.types'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { positiveId } from '../utils/municipal.format'
import MunicipalFeedback from '../components/MunicipalFeedback.vue'
import PoaForm from '../components/PoaForm.vue'
import MunicipalSidePanel from '../components/MunicipalSidePanel.vue'
import PoaDocumentsPanel from '../components/PoaDocumentsPanel.vue'
import type { MunicipalPoa } from '../types/poa.types'
const props = defineProps<{ municipalityId: number; municipality: Municipality | null }>()
const emit = defineEmits<{ busy: [boolean]; dirty: [boolean] }>()
const route = useRoute()
const auth = useAuthStore()
const editing = ref(route.hash === '#editar')
const documentDirty = ref(false)
const documentBusy = ref(false)
const formBusy = ref(false)
const formDirty = ref(false)
const sidePanel = ref<InstanceType<typeof MunicipalSidePanel>>()
watch(
  () => documentBusy.value || formBusy.value,
  (value) => emit('busy', value),
  { flush: 'sync' },
)
watch(
  () => documentDirty.value || formDirty.value,
  (value) => emit('dirty', value),
  { flush: 'sync' },
)
const canEdit = computed(
  () => props.municipality?.active && auth.hasPermission('municipal.poas.update'),
)
const id = computed(() => positiveId(route.params.poaId))
const {
  data: poa,
  error,
  loading,
  reload,
} = useMunicipalQuery(
  'municipal.poas.view',
  () => id.value,
  (signal) => (id.value ? poasApi.show(props.municipalityId, id.value, signal) : null),
)
function close() {
  editing.value = false
  formDirty.value = false
  formBusy.value = false
}
function saved(value: MunicipalPoa) {
  poa.value = value
  close()
}
function documentsDirty(value: boolean) {
  documentDirty.value = value
}
function documentsBusy(value: boolean) {
  documentBusy.value = value
}
</script>
<template>
  <div class="flex min-w-0 flex-col gap-5">
    <RouterLink
      class="kt-btn kt-btn-ghost w-fit px-0 text-muted-foreground"
      :to="{ name: 'territory.poas.index', params: { municipalityId }, query: route.query }"
      ><i class="ki-filled ki-arrow-left" aria-hidden="true" />POA municipales</RouterLink
    >
    <MunicipalFeedback :error="error" retry @retry="reload" />
    <p v-if="loading" role="status">Cargando POA…</p>
    <p v-if="!id" role="alert">Referencia de POA no válida.</p>
    <template v-if="poa">
      <section class="kt-card min-w-0" aria-label="Información del POA">
        <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <div
            class="flex shrink-0 items-center gap-3 rounded-lg bg-muted/50 px-5 py-4 sm:flex-col sm:items-start sm:px-6 sm:py-5"
          >
            <span class="text-xs text-muted-foreground">Gestión fiscal</span
            ><span class="text-3xl font-semibold tabular-nums tracking-tight">{{
              poa.fiscal_year
            }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-medium text-muted-foreground">Información del POA</h2>
            <h3 class="mt-2 break-words text-xl font-semibold tracking-tight">
              {{ poa.title || 'Sin título' }}
            </h3>
            <dl class="mt-4 text-sm">
              <dt class="font-medium">Observaciones</dt>
              <dd
                class="mt-1 whitespace-pre-wrap break-words leading-relaxed text-muted-foreground"
              >
                {{ poa.notes || 'Sin observaciones' }}
              </dd>
            </dl>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="kt-btn kt-btn-sm kt-btn-outline self-start text-foreground"
            :disabled="documentBusy || documentDirty"
            @click="editing = true"
          >
            <i class="ki-filled ki-pencil" aria-hidden="true" />Editar POA
          </button>
        </div>
      </section>
      <PoaDocumentsPanel
        :municipality-id="municipalityId"
        :poa="poa"
        :writable="!!municipality?.active"
        @dirty="documentsDirty"
        @busy="documentsBusy"
      />
    </template>
    <MunicipalSidePanel
      v-if="editing && canEdit && municipality && poa"
      ref="sidePanel"
      title="Editar POA municipal"
      :description="municipality.name + ' · Gestión ' + poa.fiscal_year"
      :busy="formBusy"
      :dirty="formDirty"
      @close="close"
    >
      <PoaForm
        :municipality-id="municipalityId"
        :municipality-name="municipality.name"
        :poa="poa"
        writable
        embedded
        @dirty="formDirty = $event"
        @busy="formBusy = $event"
        @saved="saved"
        @close="sidePanel?.requestClose()"
      />
    </MunicipalSidePanel>
  </div>
</template>
