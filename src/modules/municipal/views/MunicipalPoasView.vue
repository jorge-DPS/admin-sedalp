<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AccessPageHeader from '@/components/ui/AccessPageHeader.vue'
import TerritorySelector from '@/modules/territory/components/TerritorySelector.vue'
import type { Municipality } from '@/modules/territory/types/territory.types'
import { positiveId } from '../utils/municipal.format'
import MunicipalPoaWorkspace from '../components/MunicipalPoaWorkspace.vue'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const busy = ref(false)
const dirty = ref(false)
const municipality = shallowRef<Municipality | null>(null)
const regionId = ref<number | null>(null)
const provinceId = ref<number | null>(null)
const municipalityId = computed({
  get: () => positiveId(route.query.municipality),
  set: (id: number | null) => {
    if (!busy.value && !dirty.value)
      void router.replace({
        query: { ...route.query, municipality: id === null ? undefined : String(id) },
      })
  },
})
const selectedMunicipality = computed(() =>
  municipality.value?.id === municipalityId.value ? municipality.value : null,
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
      title="POA municipales"
      description="Acceso directo a los POA y documentos remitidos por los municipios."
    />
    <div class="kt-container-fixed flex flex-col gap-5 pb-10">
      <section class="kt-card">
        <div class="kt-card-header"><h2 class="kt-card-title">Seleccionar municipio</h2></div>
        <div class="kt-card-content">
          <TerritorySelector
            v-model:municipality-id="municipalityId"
            v-model:region-id="regionId"
            v-model:province-id="provinceId"
            :disabled="busy || dirty"
            @municipality-change="municipality = $event"
          />
        </div>
      </section>
      <p
        v-if="municipalityId === null"
        role="status"
        class="rounded-xl border border-border p-5 text-sm text-muted-foreground"
      >
        Selecciona un municipio para consultar sus POA.
      </p>
      <template v-else>
        <div v-if="selectedMunicipality" class="rounded-xl border border-border p-4">
          <h2 class="text-lg font-semibold">{{ selectedMunicipality.name }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ selectedMunicipality.province?.name ?? 'Provincia no informada' }} ·
            {{ selectedMunicipality.region?.name ?? 'Región no informada' }}
          </p>
        </div>
        <p v-if="dirty" role="status" class="text-xs text-muted-foreground">
          Guarda o cancela el formulario antes de cambiar de municipio o salir.
        </p>
        <MunicipalPoaWorkspace
          :key="municipalityId"
          :municipality-id="municipalityId"
          :municipality="selectedMunicipality"
          @busy="busy = $event"
          @dirty="dirty = $event"
        />
      </template>
    </div>
  </div>
</template>
