<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { useDocumentDownload } from '../composables/useDocumentDownload'
import type { MunicipalPoa, PoaDocument, PoaDocumentType } from '../types/poa.types'
import { fileSize, municipalDate } from '../utils/municipal.format'
import MunicipalFeedback from './MunicipalFeedback.vue'
import PoaUploadModal from './PoaUploadModal.vue'
import PoaDocumentModal from './PoaDocumentModal.vue'

const props = defineProps<{
  municipalityId: number
  poa: MunicipalPoa
  writable: boolean
  inline?: boolean
}>()
const emit = defineEmits<{ changed: []; busy: [value: boolean]; dirty: [value: boolean] }>()
const auth = useAuthStore()
const type = ref<PoaDocumentType | ''>('')
const current = ref<'' | 'yes' | 'no'>('')
const published = ref<'' | 'yes' | 'no'>('')
const page = ref(1)
const revision = ref(0)
const uploadOpen = ref(false)
const selected = ref<{ id: number; publish: boolean } | null>(null)
const actionBusy = ref(false)
const notice = ref('')
const filters = computed(() => ({
  page: page.value,
  per_page: 15,
  document_type: type.value || undefined,
  is_current: current.value === '' ? undefined : current.value === 'yes',
  published: published.value === '' ? undefined : published.value === 'yes',
}))
const {
  data: documents,
  loading,
  error,
  permitted,
  reload,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => [props.poa.id, filters.value, revision.value],
  (signal) => poasApi.documents(props.municipalityId, props.poa.id, filters.value, signal),
)
const {
  data: currentResult,
  error: currentError,
  loading: currentLoading,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => [props.poa.id, revision.value],
  (signal) =>
    poasApi.documents(
      props.municipalityId,
      props.poa.id,
      { is_current: true, per_page: 1 },
      signal,
    ),
)
const {
  busy: downloading,
  error: downloadError,
  download,
} = useDocumentDownload(props.municipalityId, props.poa.id, props.poa.fiscal_year)
const canUpload = computed(() => props.writable && auth.hasPermission('municipal.documents.upload'))
const canPublish = computed(
  () => props.writable && auth.hasPermission('municipal.documents.publish'),
)
const currentDocument = computed(() => currentResult.value?.data[0])
watch(
  [type, current, published],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
watch(actionBusy, (value) => emit('busy', value), { flush: 'sync' })
watch(uploadOpen, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
function uploaded(document: PoaDocument): void {
  uploadOpen.value = false
  type.value = ''
  current.value = ''
  published.value = ''
  page.value = Math.ceil(document.version_number / 15)
  revision.value += 1
  notice.value = `Versión ${document.version_number} registrada. El PDF se conserva como una nueva versión y todavía no está publicado.`
  emit('changed')
}
function publicationSaved(document: PoaDocument): void {
  selected.value = null
  revision.value += 1
  notice.value = `Versión ${document.version_number} publicada y vigente. Las versiones anteriores permanecen en el historial.`
  emit('changed')
}
</script>
<template>
  <section class="flex min-w-0 flex-col gap-4" aria-labelledby="poa-documents-title">
    <div v-show="!inline || (!uploadOpen && !selected)" class="flex min-w-0 flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="poa-documents-title" class="text-xl font-semibold">Documentos y versiones</h2>
        <button
          v-if="canUpload"
          class="kt-btn kt-btn-primary"
          type="button"
          :disabled="actionBusy"
          @click="uploadOpen = true"
        >
          Subir PDF
        </button>
      </div>
      <p v-if="!permitted" role="status" class="rounded-xl border border-border p-4 text-sm">
        No tienes permiso para consultar los documentos. Las acciones autorizadas se muestran de
        forma independiente.
      </p>
      <template v-if="permitted">
        <p v-if="currentLoading" role="status" class="text-sm text-muted-foreground">
          Consultando versión vigente…
        </p>
        <MunicipalFeedback :error="currentError" />
        <div
          v-if="currentDocument"
          class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm"
        >
          <strong>Versión vigente: {{ currentDocument.version_number }}</strong> ·
          {{ currentDocument.title }}
        </div>
        <p v-else-if="!currentLoading && !currentError" class="text-sm text-muted-foreground">
          Este POA todavía no tiene una versión vigente.
        </p>
        <p class="text-sm text-muted-foreground">
          Una versión publicada puede seguir disponible públicamente aunque deje de ser vigente.
        </p>
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="flex flex-col gap-2 text-sm"
            >Tipo de documento<select v-model="type" class="kt-select w-full text-foreground">
              <option value="">Todos los tipos</option>
              <option value="initial">Inicial</option>
              <option value="reformulated">Reformulado</option>
            </select></label
          >
          <label class="flex flex-col gap-2 text-sm"
            >Vigencia<select v-model="current" class="kt-select w-full text-foreground">
              <option value="">Todas las versiones</option>
              <option value="yes">Vigente</option>
              <option value="no">No vigentes</option>
            </select></label
          >
          <label class="flex flex-col gap-2 text-sm"
            >Publicación<select v-model="published" class="kt-select w-full text-foreground">
              <option value="">Todos los estados</option>
              <option value="yes">Publicados</option>
              <option value="no">No publicados</option>
            </select></label
          >
        </div>
        <MunicipalFeedback :error="error" retry @retry="reload" />
        <MunicipalFeedback :error="downloadError" />
        <p
          v-if="notice"
          role="status"
          class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm"
        >
          {{ notice }}
        </p>
        <div v-if="!error" class="kt-card min-w-0" :aria-busy="loading">
          <div class="kt-card-table overflow-x-auto">
            <table class="kt-table align-middle">
              <thead>
                <tr>
                  <th>Versión / tipo</th>
                  <th>Documento</th>
                  <th>Recepción / tamaño</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="5" class="py-10 text-center text-muted-foreground">
                    <span role="status">Cargando documentos…</span>
                  </td>
                </tr>
                <template v-else>
                  <tr v-for="document in documents?.data" :key="document.id">
                    <td>
                      <p class="font-semibold">Versión {{ document.version_number }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ document.document_type === 'initial' ? 'Inicial' : 'Reformulado' }}
                      </p>
                    </td>
                    <td>
                      <p class="font-medium">{{ document.title }}</p>
                      <p class="max-w-72 break-all text-xs text-muted-foreground">
                        {{ document.original_filename ?? 'Nombre no informado' }}
                      </p>
                    </td>
                    <td>
                      <p>{{ municipalDate(document.received_at) }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ fileSize(document.file_size_bytes) }}
                      </p>
                    </td>
                    <td>
                      <div class="flex flex-col items-start gap-2">
                        <span
                          class="kt-badge kt-badge-outline"
                          :class="document.is_published ? 'kt-badge-success' : 'kt-badge-secondary'"
                          >{{ document.is_published ? 'Publicado' : 'No publicado' }}</span
                        ><span
                          class="kt-badge kt-badge-outline"
                          :class="document.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
                          >{{ document.is_current ? 'Vigente' : 'No vigente' }}</span
                        >
                      </div>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                          type="button"
                          :aria-label="`Detalle de versión ${document.version_number}`"
                          @click="selected = { id: document.id, publish: false }"
                        >
                          Detalle
                        </button>
                        <button
                          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                          type="button"
                          :disabled="downloading"
                          :aria-label="`Descargar versión ${document.version_number}`"
                          @click="download(document.id, document.version_number)"
                        >
                          Descargar
                        </button>
                        <button
                          v-if="canPublish && !(document.is_current && document.is_published)"
                          class="kt-btn kt-btn-sm kt-btn-primary"
                          type="button"
                          :disabled="actionBusy"
                          :aria-label="`Publicar versión ${document.version_number}`"
                          @click="selected = { id: document.id, publish: true }"
                        >
                          Publicar como vigente
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!documents?.data.length">
                    <td colspan="5" class="py-10 text-center text-muted-foreground">
                      No hay documentos para estos filtros.
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <TerritoryPagination
            :meta="documents?.meta ?? null"
            :loading="loading"
            label="Paginación de documentos POA"
            class="kt-card-footer"
            @page="page = $event"
          />
        </div>
      </template>
      <p v-if="!permitted && notice" role="status" class="text-sm">{{ notice }}</p>
    </div>
    <PoaUploadModal
      v-if="uploadOpen"
      :inline="inline"
      :writable="writable"
      :municipality-id="municipalityId"
      :poa-id="poa.id"
      :fiscal-year="poa.fiscal_year"
      @busy="actionBusy = $event"
      @close="uploadOpen = false"
      @saved="uploaded"
    />
    <PoaDocumentModal
      v-if="selected && permitted"
      :inline="inline"
      :municipality-id="municipalityId"
      :poa-id="poa.id"
      :document-id="selected.id"
      :fiscal-year="poa.fiscal_year"
      :confirm-publication="selected.publish"
      :writable="writable"
      @close="selected = null"
      @busy="actionBusy = $event"
      @published="publicationSaved"
    />
  </section>
</template>
