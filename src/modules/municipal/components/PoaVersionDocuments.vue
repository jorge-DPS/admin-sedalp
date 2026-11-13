<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { poaVersionsApi } from '../api/poaVersions.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { usePoaVersionActions } from '../composables/usePoaVersionActions'
import { useDocumentDownload } from '../composables/useDocumentDownload'
import { fileSize, municipalDate } from '../utils/municipal.format'
import type { MunicipalPoaVersion, PoaVersionDocument } from '../types/poa.types'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'
import MunicipalSidePanel from './MunicipalSidePanel.vue'
import PoaUploadForm from './PoaUploadForm.vue'
import PoaDocumentDetail from './PoaDocumentDetail.vue'
const props = defineProps<{
  municipalityId: number
  poaId: number
  fiscalYear: number
  version: MunicipalPoaVersion
  writable: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{
  busy: [boolean]
  dirty: [boolean]
  uploaded: [PoaVersionDocument]
  published: [MunicipalPoaVersion]
}>()
const auth = useAuthStore()
const page = ref(1),
  revision = ref(0)
const uploadOpen = ref(false),
  uploadBusy = ref(false),
  uploadDirty = ref(false)
const selectedDocument = ref<number | null>(null)
const uploadPanel = ref<InstanceType<typeof MunicipalSidePanel>>()
const documentPanel = ref<InstanceType<typeof MunicipalSidePanel>>()
const uploadForm = ref<InstanceType<typeof PoaUploadForm>>()
const publication = usePoaVersionActions(props.municipalityId, props.poaId, () => props.writable)
const busy = computed(() => publication.busy.value || uploadBusy.value)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(uploadDirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
const canUpload = computed(
  () =>
    props.writable &&
    props.version.published_at === null &&
    auth.hasPermission('municipal.documents.upload'),
)
const canPublish = computed(
  () =>
    props.writable &&
    auth.hasPermission('municipal.documents.publish') &&
    !(props.version.is_current && props.version.is_published),
)
const {
  data: documents,
  loading,
  error,
  reload,
  permitted,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => [props.municipalityId, props.poaId, props.version.id, page.value, revision.value],
  (signal) =>
    poaVersionsApi.documents(
      props.municipalityId,
      props.poaId,
      props.version.id,
      page.value,
      signal,
    ),
)
const {
  busy: downloading,
  error: downloadError,
  download,
} = useDocumentDownload(props.municipalityId, props.poaId, props.fiscalYear, props.version.id)
const notice = ref('')
async function closeUpload() {
  if (uploadBusy.value || !(await uploadForm.value?.discard())) return
  uploadOpen.value = false
  uploadDirty.value = false
  revision.value += 1
}
function uploaded(document: PoaVersionDocument) {
  uploadOpen.value = false
  uploadDirty.value = false
  page.value = Math.max(1, Math.ceil(((documents.value?.meta.total ?? 0) + 1) / 15))
  revision.value += 1
  notice.value =
    'PDF adjuntado a la versión ' +
    props.version.version_number +
    '. Puedes incorporar otros documentos antes de publicarla.'
  emit('uploaded', document)
}
async function publish() {
  if (!canPublish.value || busy.value || props.disabled) return
  const saved = await publication.publish(props.version.id)
  if (saved) {
    notice.value =
      'Versión ' +
      saved.version_number +
      ' publicada y vigente. Sus documentos anteriores se conservan.'
    emit('published', saved)
  }
}
</script>
<template>
  <section
    class="kt-card min-w-0 overflow-hidden"
    aria-label="Documentos de la versión seleccionada"
  >
    <header
      class="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:p-6"
    >
      <div class="min-w-0">
        <h3 class="text-lg font-semibold">Documentos de la versión {{ version.version_number }}</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ version.document_type === 'initial' ? 'Documento inicial' : 'Reformulación' }} · POA
          {{ fiscalYear }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            class="kt-badge kt-badge-outline"
            :class="version.is_published ? 'kt-badge-success' : 'kt-badge-secondary'"
            >{{
              version.is_published
                ? 'Publicada'
                : version.published_at
                  ? 'Publicación programada'
                  : 'Borrador'
            }}</span
          ><span
            class="kt-badge kt-badge-outline"
            :class="version.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
            >{{ version.is_current ? 'Vigente' : 'No vigente' }}</span
          >
        </div>
      </div>
      <button
        v-if="canUpload"
        class="kt-btn kt-btn-primary"
        type="button"
        :disabled="busy || disabled"
        @click="uploadOpen = true"
      >
        <i class="ki-filled ki-file-up" aria-hidden="true" />Subir PDF
      </button>
    </header>
    <div
      class="border-b border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6"
    >
      {{
        version.published_at
          ? 'El contenido de esta versión está cerrado. Para incorporar otros archivos, crea una nueva versión.'
          : 'La publicación incluirá todos los PDF de esta versión. Añade y revisa los archivos antes de publicar.'
      }}
    </div>
    <MunicipalFeedback :error="error" retry class="m-5" @retry="reload" /><MunicipalFeedback
      :error="downloadError"
      class="mx-5 mt-4"
    /><MunicipalFeedback :error="publication.error.value" class="mx-5 mt-4" />
    <p v-if="notice" role="status" class="mx-5 mt-4 rounded-lg bg-primary/5 p-3 text-sm">
      {{ notice }}
    </p>
    <p v-if="!permitted" role="status" class="p-5 text-sm text-muted-foreground">
      No tienes permiso para consultar los documentos de esta versión.
    </p>
    <template v-else
      ><div
        class="overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
        tabindex="0"
        role="region"
        aria-label="Archivos PDF de la versión"
      >
        <table class="kt-table min-w-[40rem] align-middle">
          <caption class="sr-only">
            Documentos PDF de la versión
            {{
              version.version_number
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Documento</th>
              <th scope="col">Recepción</th>
              <th scope="col">Tamaño</th>
              <th scope="col" class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="p-8 text-center">
                <span role="status">Cargando documentos…</span>
              </td>
            </tr>
            <template v-else-if="!error"
              ><tr v-for="document in documents?.data" :key="document.id">
                <td class="min-w-56 max-w-96 whitespace-normal break-words">
                  <p class="font-medium">{{ document.title }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ document.original_filename || 'Nombre no informado' }}
                  </p>
                </td>
                <td>{{ municipalDate(document.received_at) }}</td>
                <td>{{ fileSize(document.file_size_bytes) }}</td>
                <td>
                  <div class="flex justify-end gap-1">
                    <button
                      class="kt-btn kt-btn-icon kt-btn-ghost text-muted-foreground"
                      type="button"
                      :aria-label="'Detalle de ' + document.title"
                      :title="'Detalle de ' + document.title"
                      :disabled="busy || disabled"
                      @click="selectedDocument = document.id"
                    >
                      <i class="ki-filled ki-eye" aria-hidden="true" /></button
                    ><button
                      class="kt-btn kt-btn-icon kt-btn-ghost text-muted-foreground"
                      type="button"
                      :aria-label="'Descargar ' + document.title"
                      :title="'Descargar ' + document.title"
                      :disabled="downloading"
                      @click="download(document.id, version.version_number)"
                    >
                      <i class="ki-filled ki-file-down" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!documents?.data.length">
                <td colspan="4" class="px-5 py-10 text-center">
                  <p class="text-sm font-medium">Esta versión todavía no tiene documentos</p>
                  <p class="mt-2 text-sm text-muted-foreground">
                    {{
                      canUpload
                        ? 'Sube el primer PDF; puedes adjuntar varios archivos a la misma versión.'
                        : 'Un usuario autorizado puede incorporar los documentos.'
                    }}
                  </p>
                </td>
              </tr></template
            >
          </tbody>
        </table>
      </div>
      <TerritoryPagination
        :meta="documents?.meta ?? null"
        :loading="loading"
        label="Paginación de documentos de la versión"
        class="border-t border-border px-5 py-4"
        @page="page = $event"
    /></template>
    <footer
      v-if="canPublish"
      class="flex flex-wrap items-center justify-between gap-4 border-t border-border p-5 sm:px-6"
    >
      <p class="max-w-lg text-xs leading-relaxed text-muted-foreground">
        Se publicará la versión completa y será la vigente. Las publicaciones anteriores se
        conservan.
      </p>
      <button
        type="button"
        class="kt-btn kt-btn-primary"
        :disabled="busy || disabled || uploadDirty || version.documents_count === 0"
        @click="publish"
      >
        {{ publication.busy.value ? 'Publicando…' : 'Publicar versión completa' }}
      </button>
    </footer>
    <MunicipalSidePanel
      v-if="uploadOpen"
      ref="uploadPanel"
      title="Adjuntar PDF"
      :description="'POA ' + fiscalYear + ' · Versión ' + version.version_number"
      :busy="uploadBusy"
      :dirty="uploadDirty"
      @close="closeUpload"
      ><PoaUploadForm
        ref="uploadForm"
        embedded
        :municipality-id="municipalityId"
        :poa-id="poaId"
        :version-id="version.id"
        :version-number="version.version_number"
        :fiscal-year="fiscalYear"
        :writable="canUpload"
        @busy="uploadBusy = $event"
        @dirty="uploadDirty = $event"
        @saved="uploaded"
        @close="uploadPanel?.requestClose()"
    /></MunicipalSidePanel>
    <MunicipalSidePanel
      v-if="selectedDocument"
      ref="documentPanel"
      title="Detalle del documento PDF"
      :description="'POA ' + fiscalYear + ' · Versión ' + version.version_number"
      @close="selectedDocument = null"
      ><PoaDocumentDetail
        embedded
        :municipality-id="municipalityId"
        :poa-id="poaId"
        :version="version"
        :document-id="selectedDocument"
        :fiscal-year="fiscalYear"
        @close="documentPanel?.requestClose()"
    /></MunicipalSidePanel>
  </section>
</template>
