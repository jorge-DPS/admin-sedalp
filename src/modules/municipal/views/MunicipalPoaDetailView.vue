<script setup lang="ts">
import { computed, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AccessPageHeader from '@/components/ui/AccessPageHeader.vue'
import { useMunicipality } from '@/modules/territory/composables/useMunicipality'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { positiveId } from '../utils/municipal.format'
import PoaDocumentsPanel from '../components/PoaDocumentsPanel.vue'
import MunicipalFeedback from '../components/MunicipalFeedback.vue'

const route = useRoute()
const auth = useAuthStore()
const municipalityId = computed(() => positiveId(route.params.municipalityId))
const poaId = computed(() => positiveId(route.params.poaId))
const busy = ref(false)
const dirty = ref(false)
const {
  municipality,
  loading: municipalityLoading,
  error: municipalityError,
  reload: reloadMunicipality,
} = useMunicipality(municipalityId)
const {
  data: poa,
  error,
  loading,
  reload,
} = useMunicipalQuery(
  'municipal.poas.view',
  () => [municipalityId.value, poaId.value],
  (signal) =>
    municipalityId.value === null || poaId.value === null
      ? null
      : poasApi.show(municipalityId.value, poaId.value, signal),
)
const writable = computed(
  () =>
    !municipalityLoading.value &&
    !municipalityError.value &&
    municipality.value?.id === municipalityId.value &&
    municipality.value?.active === true,
)
function canNavigate(): boolean {
  return (!busy.value && !dirty.value) || !auth.isAuthenticated
}
onBeforeRouteLeave(canNavigate)
onBeforeRouteUpdate(canNavigate)
</script>
<template>
  <div class="w-full min-w-0 max-w-[100vw] lg:max-w-[calc(100vw-var(--sidebar-width))]">
    <AccessPageHeader
      title="Detalle del POA municipal"
      description="Consulta el expediente y conserva el historial de documentos municipales."
    />
    <div class="kt-container-fixed flex flex-col gap-5 pb-10">
      <RouterLink
        :to="{ name: 'municipal.poas.index', query: { municipality: municipalityId ?? undefined } }"
        class="kt-btn kt-btn-outline w-fit text-foreground"
        >Volver a POA municipales</RouterLink
      >
      <MunicipalFeedback :error="error" retry @retry="reload" />
      <MunicipalFeedback :error="municipalityError" retry @retry="reloadMunicipality" />
      <p v-if="municipalityId === null || poaId === null" role="alert" class="text-destructive">
        La referencia del POA no es válida.
      </p>
      <p v-else-if="loading" role="status">Cargando POA…</p>
      <template v-else-if="poa && municipalityId !== null">
        <section class="kt-card">
          <div class="kt-card-content flex flex-col gap-2">
            <h2 class="text-xl font-semibold">
              POA {{ poa.fiscal_year }} · {{ municipality?.name ?? `Municipio #${municipalityId}` }}
            </h2>
            <p v-if="municipality" class="text-sm text-muted-foreground">
              {{ municipality.province?.name ?? 'Provincia no informada' }} ·
              {{ municipality.region?.name ?? 'Región no informada' }}
            </p>
            <h3 v-if="poa.title" class="break-words font-medium">{{ poa.title }}</h3>
            <p class="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {{ poa.notes ?? 'Sin observaciones' }}
            </p>
            <p v-if="!writable" class="text-sm text-muted-foreground">
              {{
                municipalityLoading
                  ? 'Confirmando el estado del municipio…'
                  : municipality?.active === false
                    ? 'Municipio inactivo: solo consulta y descarga.'
                    : 'Solo consulta hasta confirmar que el municipio existe y está activo.'
              }}
            </p>
          </div>
        </section>
        <PoaDocumentsPanel
          inline
          :key="`${municipalityId}-${poa.id}`"
          :municipality-id="municipalityId"
          :poa="poa"
          :writable="writable"
          @busy="busy = $event"
          @dirty="dirty = $event"
        />
      </template>
    </div>
  </div>
</template>
