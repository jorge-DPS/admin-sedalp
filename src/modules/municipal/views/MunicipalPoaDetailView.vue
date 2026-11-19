<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Municipality } from '@/modules/territory/types/territory.types'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { positiveId } from '../utils/municipal.format'
import MunicipalFeedback from '../components/MunicipalFeedback.vue'
import MunicipalPageHeader from '../components/MunicipalPageHeader.vue'
import MunicipalFormDialog from '../components/MunicipalFormDialog.vue'
import PoaForm from '../components/PoaForm.vue'
import PoaDocumentsPanel from '../components/PoaDocumentsPanel.vue'
import type { MunicipalPoa } from '../types/poa.types'

const props = defineProps<{ municipalityId: number; municipality: Municipality | null }>()
const emit = defineEmits<{ busy: [boolean]; dirty: [boolean] }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notice = ref('')
const editor = ref<InstanceType<typeof MunicipalFormDialog>>()
const documentDirty = ref(false)
const documentBusy = ref(false)
const formBusy = ref(false)
const formDirty = ref(false)
const canEdit = computed(
  () => props.municipality?.active && auth.hasPermission('municipal.poas.update'),
)
const editing = ref(route.hash === '#editar')
watch(
  () => route.hash,
  (hash) => {
    editing.value = hash === '#editar'
  },
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
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})

function close() {
  formDirty.value = false
  formBusy.value = false
  editing.value = false
  if (route.hash === '#editar') void router.replace({ hash: '', query: route.query })
}

function saved(value: MunicipalPoa) {
  poa.value = value
  notice.value = 'Los datos del POA se actualizaron.'
  close()
}
</script>

<template>
  <div class="flex min-w-0 max-w-5xl flex-col gap-4">
    <MunicipalFeedback :error="error" retry @retry="reload" />
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">Cargando POA…</p>
    <p v-if="!id" role="alert">Referencia de POA no válida.</p>
    <template v-if="poa">
      <div class="space-y-2.5">
        <RouterLink
          class="kt-btn kt-btn-sm kt-btn-ghost -ms-2 text-muted-foreground"
          :to="{ name: 'territory.poas.index', params: { municipalityId }, query: route.query }"
          ><i class="ki-filled ki-arrow-left" aria-hidden="true" />Volver a POA
          municipales</RouterLink
        >
        <MunicipalPageHeader
          :title="'POA ' + poa.fiscal_year"
          :description="poa.title || 'Sin título'"
        >
          <template v-if="canEdit" #actions>
            <button
              type="button"
              class="kt-btn kt-btn-sm kt-btn-outline"
              :disabled="documentBusy || documentDirty"
              @click="editing = true"
            >
              <i class="ki-filled ki-pencil" aria-hidden="true" />Editar POA
            </button>
          </template>
        </MunicipalPageHeader>
        <p
          v-if="notice"
          role="status"
          class="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
        >
          {{ notice }}
        </p>
        <p
          v-if="poa.notes"
          class="whitespace-pre-wrap break-words border-s-2 border-border ps-3 text-sm text-muted-foreground"
        >
          <span class="block font-medium text-foreground">Observaciones</span>{{ poa.notes }}
        </p>
      </div>
      <PoaDocumentsPanel
        :municipality-id="municipalityId"
        :poa="poa"
        :writable="!!municipality?.active"
        @dirty="documentDirty = $event"
        @busy="documentBusy = $event"
      />
      <MunicipalFormDialog
        v-if="editing && canEdit && municipality"
        ref="editor"
        title="Editar POA municipal"
        :description="'Gestión fiscal ' + poa.fiscal_year"
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
          @close="editor?.requestClose()"
        />
      </MunicipalFormDialog>
    </template>
  </div>
</template>
