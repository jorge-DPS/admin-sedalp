<script setup lang="ts">
import { poaVersionsApi } from '../api/poaVersions.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { useDocumentDownload } from '../composables/useDocumentDownload'
import { fileSize, municipalDate } from '../utils/municipal.format'
import type { MunicipalPoaVersion } from '../types/poa.types'
import MunicipalSection from './MunicipalSection.vue'
import MunicipalFeedback from './MunicipalFeedback.vue'
const props = defineProps<{
  municipalityId: number
  poaId: number
  version: MunicipalPoaVersion
  documentId: number
  fiscalYear: number
  embedded?: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const {
  data: document,
  loading,
  error,
  reload,
} = useMunicipalQuery(
  'municipal.documents.view',
  () => [props.municipalityId, props.poaId, props.version.id, props.documentId],
  (signal) =>
    poaVersionsApi.document(
      props.municipalityId,
      props.poaId,
      props.version.id,
      props.documentId,
      signal,
    ),
)
const {
  busy,
  error: downloadError,
  download,
} = useDocumentDownload(props.municipalityId, props.poaId, props.fiscalYear, props.version.id)
</script>
<template>
  <MunicipalSection title="Detalle del documento PDF" :busy="busy" :embedded="embedded"
    ><div class="flex flex-col gap-5">
      <MunicipalFeedback :error="error" retry @retry="reload" /><MunicipalFeedback
        :error="downloadError"
      />
      <p v-if="loading" role="status" class="text-sm text-muted-foreground">
        Consultando documento…
      </p>
      <template v-if="document"
        ><h3 class="break-words text-lg font-semibold">{{ document.title }}</h3>
        <p class="text-sm text-muted-foreground">
          POA {{ fiscalYear }} · Versión {{ version.version_number }}
        </p>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div class="min-w-0 sm:col-span-2">
            <dt class="text-xs text-muted-foreground">Archivo original</dt>
            <dd class="mt-1 break-words">{{ document.original_filename || 'No informado' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Tamaño</dt>
            <dd class="mt-1">{{ fileSize(document.file_size_bytes) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Fecha de recepción</dt>
            <dd class="mt-1">{{ municipalDate(document.received_at) }}</dd>
          </div>
          <div class="min-w-0 sm:col-span-2">
            <dt class="text-xs text-muted-foreground">Referencia documental</dt>
            <dd class="mt-1 break-words">{{ document.document_reference || 'Sin referencia' }}</dd>
          </div>
          <div class="min-w-0 sm:col-span-2">
            <dt class="text-xs text-muted-foreground">Observaciones</dt>
            <dd class="mt-1 whitespace-pre-wrap break-words">
              {{ document.notes || 'Sin observaciones' }}
            </dd>
          </div>
        </dl>
        <p class="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          La publicación y vigencia corresponden a la versión completa, junto con todos sus
          documentos.
        </p>
        <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            class="kt-btn kt-btn-outline text-foreground"
            :disabled="busy"
            @click="emit('close')"
          >
            Cerrar</button
          ><button
            type="button"
            class="kt-btn kt-btn-primary"
            :disabled="busy"
            @click="download(document.id, version.version_number)"
          >
            {{ busy ? 'Descargando…' : 'Descargar PDF' }}
          </button>
        </div></template
      >
    </div></MunicipalSection
  >
</template>
