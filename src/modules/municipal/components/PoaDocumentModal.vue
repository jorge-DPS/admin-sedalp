<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { usePoaDocumentActions } from '../composables/usePoaActions'
import { useDocumentDownload } from '../composables/useDocumentDownload'
import { fileSize, municipalDate } from '../utils/municipal.format'
import type { PoaDocument } from '../types/poa.types'
import MunicipalDialog from './MunicipalDialog.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'

const props = defineProps<{
  municipalityId: number
  poaId: number
  documentId: number
  fiscalYear: number
  confirmPublication: boolean
  writable: boolean
  inline?: boolean
}>()
const emit = defineEmits<{
  close: []
  published: [document: PoaDocument]
  busy: [value: boolean]
}>()
const auth = useAuthStore()
const {
  data: document,
  loading,
  error,
  reload,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => props.documentId,
  (signal) => poasApi.document(props.municipalityId, props.poaId, props.documentId, signal),
)
const {
  busy,
  error: publicationError,
  publish,
} = usePoaDocumentActions(props.municipalityId, props.poaId)
const {
  busy: downloading,
  error: downloadError,
  download,
} = useDocumentDownload(props.municipalityId, props.poaId, props.fiscalYear)
const confirming = ref(props.confirmPublication)
const canPublish = computed(
  () =>
    props.writable &&
    auth.hasPermission('municipal.documents.publish') &&
    document.value &&
    !(document.value.is_current && document.value.is_published),
)
const fields = computed(() =>
  document.value
    ? [
        { label: 'Versión', value: String(document.value.version_number) },
        {
          label: 'Tipo',
          value: document.value.document_type === 'initial' ? 'Inicial' : 'Reformulado',
        },
        { label: 'Archivo original', value: document.value.original_filename ?? 'No informado' },
        { label: 'Tamaño', value: fileSize(document.value.file_size_bytes) },
        {
          label: 'Referencia documental',
          value: document.value.document_reference ?? 'Sin referencia',
        },
        { label: 'Recepción', value: municipalDate(document.value.received_at) },
        { label: 'Publicación', value: municipalDate(document.value.published_at) },
        {
          label: 'Estado de publicación',
          value: document.value.is_published ? 'Publicado' : 'No publicado',
        },
        { label: 'Vigencia', value: document.value.is_current ? 'Versión vigente' : 'No vigente' },
        { label: 'Observaciones', value: document.value.notes ?? 'Sin observaciones' },
      ]
    : [],
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
async function confirm(): Promise<void> {
  if (!canPublish.value || !document.value || busy.value) return
  const result = await publish(document.value.id)
  if (result) emit('published', result)
}
</script>
<template>
  <MunicipalDialog
    :title="confirming ? 'Confirmar publicación del PDF' : 'Detalle del documento PDF'"
    :busy="busy"
    :inline="inline"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <MunicipalFeedback :error="error" retry @retry="reload" />
      <MunicipalFeedback :error="publicationError" />
      <MunicipalFeedback :error="downloadError" />
      <p v-if="loading" role="status" class="py-6 text-center text-muted-foreground">
        Cargando documento…
      </p>
      <template v-else-if="document">
        <h3 class="break-words text-lg font-semibold">{{ document.title }}</h3>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div v-for="field in fields" :key="field.label" class="min-w-0">
            <dt class="text-xs text-muted-foreground">{{ field.label }}</dt>
            <dd class="mt-1 whitespace-pre-wrap break-words text-sm">{{ field.value }}</dd>
          </div>
        </dl>
        <div
          v-if="confirming && canPublish"
          class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-6"
        >
          Se publicará la versión {{ document.version_number }} del POA {{ fiscalYear }} y pasará a
          ser la vigente. La versión vigente anterior dejará de serlo; sus archivos y publicaciones
          históricas se conservarán.
        </div>
        <p v-if="document.is_published && document.is_current" role="status" class="text-sm">
          Este documento ya está publicado y vigente.
        </p>
        <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            class="kt-btn kt-btn-outline text-foreground"
            type="button"
            :disabled="busy"
            @click="emit('close')"
          >
            Cerrar
          </button>
          <button
            class="kt-btn kt-btn-outline text-foreground"
            type="button"
            :disabled="busy || downloading"
            @click="download(document.id, document.version_number)"
          >
            {{ downloading ? 'Descargando…' : 'Descargar PDF' }}
          </button>
          <button
            v-if="canPublish && !confirming"
            class="kt-btn kt-btn-primary"
            type="button"
            @click="confirming = true"
          >
            Publicar como vigente
          </button>
          <button
            v-if="canPublish && confirming"
            class="kt-btn kt-btn-primary"
            type="button"
            :disabled="busy"
            @click="confirm"
          >
            {{ busy ? 'Publicando…' : 'Confirmar publicación' }}
          </button>
        </div>
      </template>
    </div>
  </MunicipalDialog>
</template>
