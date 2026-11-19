<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { poaVersionsApi } from '../api/poaVersions.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { usePoaVersionActions } from '../composables/usePoaVersionActions'
import type {
  MunicipalPoa,
  MunicipalPoaVersion,
  PoaDocumentType,
  PoaVersionDocument,
} from '../types/poa.types'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'
import MunicipalPageHeader from './MunicipalPageHeader.vue'
import PoaVersionDocuments from './PoaVersionDocuments.vue'
const props = defineProps<{ municipalityId: number; poa: MunicipalPoa; writable: boolean }>()
const emit = defineEmits<{ changed: []; busy: [boolean]; dirty: [boolean] }>()
const auth = useAuthStore()
const page = ref(1),
  revision = ref(0)
const type = ref<PoaDocumentType | ''>(''),
  current = ref<'' | 'yes' | 'no'>(''),
  published = ref<'' | 'yes' | 'no'>('')
const selected = shallowRef<MunicipalPoaVersion | null>(null)
const documentsBusy = ref(false),
  documentsDirty = ref(false)
const action = usePoaVersionActions(props.municipalityId, props.poa.id, () => props.writable)
const busy = computed(() => action.busy.value || documentsBusy.value)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(documentsDirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
watch([type, current, published], () => {
  page.value = 1
})
const filters = computed(() => ({
  page: page.value,
  per_page: 10,
  document_type: type.value || undefined,
  is_current: current.value === '' ? undefined : current.value === 'yes',
  published: published.value === '' ? undefined : published.value === 'yes',
}))
const {
  data: versions,
  error,
  loading,
  reload,
  permitted,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => [props.municipalityId, props.poa.id, filters.value, revision.value],
  (signal) => poaVersionsApi.index(props.municipalityId, props.poa.id, filters.value, signal),
)
watch(versions, (result) => {
  if (!result) return
  selected.value =
    result.data.find((version) => version.id === selected.value?.id) ??
    result.data.find((version) => version.is_current) ??
    result.data[0] ??
    null
})
const canCreate = computed(() => props.writable && auth.hasPermission('municipal.documents.upload'))
const notice = ref('')
async function create() {
  if (busy.value || documentsDirty.value || !canCreate.value) return
  const version = await action.create()
  if (!version) return
  selected.value = version
  type.value = ''
  current.value = ''
  published.value = ''
  page.value = 1
  revision.value += 1
  notice.value =
    'Versión ' +
    version.version_number +
    ' creada. Adjunta sus PDF y publica la versión cuando esté completa.'
  emit('changed')
}
function select(version: MunicipalPoaVersion) {
  if (!busy.value && !documentsDirty.value) selected.value = version
}
function uploaded(_document: PoaVersionDocument) {
  if (selected.value)
    selected.value = {
      ...selected.value,
      documents_count: (selected.value.documents_count ?? 0) + 1,
    }
  revision.value += 1
  emit('changed')
}
function publishedVersion(version: MunicipalPoaVersion) {
  selected.value = version
  revision.value += 1
  emit('changed')
}
</script>
<template>
  <section class="flex min-w-0 flex-col gap-3" aria-label="Versiones del POA">
    <MunicipalPageHeader title="Versiones del POA"
      ><template #actions
        ><button
          v-if="canCreate"
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline"
          :disabled="busy || documentsDirty"
          @click="create"
        >
          <i class="ki-filled ki-plus" aria-hidden="true" />{{
            action.busy.value ? 'Creando…' : 'Nueva versión'
          }}
        </button></template
      ></MunicipalPageHeader
    >
    <MunicipalFeedback :error="action.error.value" />
    <p
      v-if="notice"
      role="status"
      class="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-sm"
    >
      {{ notice }}
    </p>
    <p v-if="!permitted" role="status" class="text-sm text-muted-foreground">
      No tienes permiso para consultar el historial de versiones.
    </p>
    <div
      class="grid min-w-0 items-start gap-3.5"
      :class="selected ? 'lg:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)]' : 'max-w-md'"
    >
      <section
        v-if="permitted"
        class="kt-card min-w-0 overflow-hidden rounded-xl"
        aria-label="Historial de versiones"
      >
        <header class="border-b border-border px-3.5 py-3">
          <h3 class="text-sm font-semibold">Historial de versiones</h3>
        </header>
        <details class="border-b border-border bg-muted/15">
          <summary
            class="cursor-pointer px-3.5 py-2.5 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
          >
            Filtrar historial<span
              v-if="type || current || published"
              class="ms-1 text-muted-foreground"
              >· activos</span
            >
          </summary>
          <div class="grid gap-2.5 px-3.5 pb-3.5 sm:max-lg:grid-cols-3">
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium"
              >Tipo de versión<select
                v-model="type"
                class="kt-select kt-select-sm w-full text-foreground"
                :disabled="busy || documentsDirty"
              >
                <option value="">Todos los tipos</option>
                <option value="initial">Inicial</option>
                <option value="reformulated">Reformulación</option>
              </select></label
            ><label class="flex min-w-0 flex-col gap-1 text-xs font-medium"
              >Vigencia<select
                v-model="current"
                class="kt-select kt-select-sm w-full text-foreground"
                :disabled="busy || documentsDirty"
              >
                <option value="">Todas las versiones</option>
                <option value="yes">Vigente</option>
                <option value="no">No vigentes</option>
              </select></label
            ><label class="flex min-w-0 flex-col gap-1 text-xs font-medium"
              >Publicación<select
                v-model="published"
                class="kt-select kt-select-sm w-full text-foreground"
                :disabled="busy || documentsDirty"
              >
                <option value="">Todos los estados</option>
                <option value="yes">Publicadas</option>
                <option value="no">No publicadas</option>
              </select></label
            >
          </div>
        </details>
        <MunicipalFeedback :error="error" retry class="m-4" @retry="reload" />
        <p v-if="loading" role="status" class="p-3.5 text-sm text-muted-foreground">
          Consultando versiones…
        </p>
        <ul v-else-if="!error" class="max-h-64 divide-y divide-border overflow-y-auto lg:max-h-96">
          <li v-for="version in versions?.data" :key="version.id">
            <button
              type="button"
              class="flex w-full flex-col items-start gap-1.5 border-s-2 border-transparent px-3 py-2.5 text-left text-foreground hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
              :aria-pressed="selected?.id === version.id"
              :disabled="busy || documentsDirty"
              :aria-label="'Seleccionar versión ' + version.version_number"
              @click="select(version)"
            >
              <span class="text-sm font-semibold"
                >Versión {{ version.version_number }}
                <span class="ms-2 text-xs font-normal text-muted-foreground">{{
                  version.document_type === 'initial' ? 'Inicial' : 'Reformulación'
                }}</span></span
              ><span class="flex flex-wrap gap-1.5"
                ><span
                  class="kt-badge kt-badge-outline"
                  :class="version.is_published ? 'kt-badge-success' : 'kt-badge-secondary'"
                  >{{ version.is_published ? 'Publicada' : 'No publicada' }}</span
                ><span v-if="version.is_current" class="kt-badge kt-badge-outline kt-badge-primary"
                  >Vigente</span
                ></span
              ><span class="text-xs text-muted-foreground"
                >{{ version.documents_count ?? '—' }} PDF</span
              >
            </button>
          </li>
          <li v-if="!versions?.data.length" class="p-5 text-sm text-muted-foreground">
            No hay versiones para esta consulta.
            {{ canCreate ? 'Puedes crear una nueva versión.' : '' }}
          </li>
        </ul>
        <TerritoryPagination
          :meta="versions?.meta ?? null"
          :loading="loading || busy || documentsDirty"
          label="Paginación de versiones del POA"
          class="border-t border-border p-3 text-xs"
          @page="page = $event"
        />
      </section>
      <PoaVersionDocuments
        v-if="selected"
        :key="selected.id"
        :municipality-id="municipalityId"
        :poa-id="poa.id"
        :fiscal-year="poa.fiscal_year"
        :version="selected"
        :writable="writable"
        :disabled="action.busy.value"
        @busy="documentsBusy = $event"
        @dirty="documentsDirty = $event"
        @uploaded="uploaded"
        @published="publishedVersion"
      />
    </div>
  </section>
</template>
