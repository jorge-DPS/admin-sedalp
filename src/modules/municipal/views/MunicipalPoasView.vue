<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AccessPageHeader from '@/components/ui/AccessPageHeader.vue'
import TerritorySelector from '@/modules/territory/components/TerritorySelector.vue'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import type { Municipality } from '@/modules/territory/types/territory.types'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { positiveId } from '../utils/municipal.format'
import type { MunicipalPoa } from '../types/poa.types'
import PoaFormModal from '../components/PoaFormModal.vue'
import MunicipalFeedback from '../components/MunicipalFeedback.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const municipalityId = computed({
  get: () => positiveId(route.query.municipality),
  set: (id: number | null) => {
    if (!busy.value)
      void router.replace({
        query: { ...route.query, municipality: id === null ? undefined : String(id) },
      })
  },
})
const regionId = ref<number | null>(null)
const provinceId = ref<number | null>(null)
const municipality = shallowRef<Municipality | null>(null)
const yearInput = ref('')
const searchInput = ref('')
const search = ref('')
const year = ref<number | undefined>()
const page = ref(1)
const revision = ref(0)
const busy = ref(false)
const formOpen = ref(false)
const editing = shallowRef<MunicipalPoa>()
const notice = ref('')
const filters = computed(() => ({
  search: search.value,
  fiscal_year: year.value,
  page: page.value,
  per_page: 15,
}))
const {
  data: poas,
  loading,
  error,
  permitted,
  reload,
} = useMunicipalQuery(
  'municipal.poas.view',
  () => [municipalityId.value, filters.value, revision.value],
  (signal) =>
    municipalityId.value === null
      ? null
      : poasApi.index(municipalityId.value, filters.value, signal),
)
const writable = computed(
  () => municipalityId.value !== null && municipality.value?.active !== false,
)
const municipalityName = computed(
  () => municipality.value?.name ?? `Municipio #${municipalityId.value}`,
)
watch(
  municipalityId,
  () => {
    page.value = 1
    search.value = ''
    searchInput.value = ''
    year.value = undefined
    yearInput.value = ''
    notice.value = ''
    formOpen.value = false
  },
  { flush: 'sync' },
)
function filter(): void {
  page.value = 1
  search.value = searchInput.value.trim()
  year.value = yearInput.value === '' ? undefined : Number(yearInput.value)
}
function clearFilters(): void {
  page.value = 1
  search.value = ''
  searchInput.value = ''
  year.value = undefined
  yearInput.value = ''
}
function create(): void {
  editing.value = undefined
  formOpen.value = true
}
function edit(poa: MunicipalPoa): void {
  editing.value = poa
  formOpen.value = true
}
function saved(poa: MunicipalPoa): void {
  formOpen.value = false
  notice.value = `POA ${poa.fiscal_year} guardado.`
  clearFilters()
  year.value = poa.fiscal_year
  yearInput.value = String(poa.fiscal_year)
  revision.value += 1
}
function canNavigate(): boolean {
  return !busy.value || !auth.isAuthenticated
}
onBeforeRouteLeave(canNavigate)
onBeforeRouteUpdate(canNavigate)
</script>
<template>
  <div class="w-full min-w-0 max-w-[100vw] lg:max-w-[calc(100vw-var(--sidebar-width))]">
    <AccessPageHeader
      title="POA municipales"
      description="Recopila, consulta y administra los POA y documentos remitidos por los municipios."
    />
    <div class="kt-container-fixed flex flex-col gap-5 pb-10">
      <section class="kt-card">
        <div class="kt-card-header"><h2 class="kt-card-title">Seleccionar municipio</h2></div>
        <div class="kt-card-content">
          <TerritorySelector
            v-model:municipality-id="municipalityId"
            v-model:region-id="regionId"
            v-model:province-id="provinceId"
            :disabled="busy"
            @municipality-change="municipality = $event"
          />
        </div>
      </section>
      <p v-if="!permitted" role="alert" class="text-sm text-destructive">
        No tienes permiso para consultar POA municipales.
      </p>
      <p
        v-else-if="municipalityId === null"
        role="status"
        class="rounded-xl border border-border p-5 text-sm text-muted-foreground"
      >
        Selecciona un municipio para consultar sus POA.
      </p>
      <template v-else>
        <section class="kt-card">
          <div class="kt-card-content flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">{{ municipalityName }}</h2>
              <p v-if="municipality" class="mt-1 text-sm text-muted-foreground">
                {{ municipality.province?.name ?? 'Provincia no informada' }} ·
                {{ municipality.region?.name ?? 'Región no informada' }}
              </p>
              <p v-if="municipality?.active === false" class="mt-2 text-sm text-muted-foreground">
                Municipio inactivo: consulta disponible; registro y edición no disponibles.
              </p>
            </div>
            <button
              v-if="writable && auth.hasPermission('municipal.poas.create')"
              class="kt-btn kt-btn-primary"
              type="button"
              @click="create"
            >
              Registrar POA
            </button>
          </div>
        </section>
        <form class="kt-card" @submit.prevent="filter">
          <div
            class="kt-card-content grid gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_minmax(0,1fr)_auto]"
          >
            <label class="flex flex-col gap-2 text-sm font-medium"
              >Gestión del POA<input
                v-model="yearInput"
                type="number"
                min="1900"
                max="2100"
                step="1"
                class="kt-input text-foreground"
                placeholder="Todas"
            /></label>
            <label class="flex flex-col gap-2 text-sm font-medium"
              >Buscar POA por título<input
                v-model="searchInput"
                type="search"
                class="kt-input text-foreground"
                maxlength="150"
            /></label>
            <div class="flex flex-wrap items-end gap-2">
              <button class="kt-btn kt-btn-primary" type="submit">Filtrar POA</button
              ><button
                class="kt-btn kt-btn-outline text-foreground"
                type="button"
                @click="clearFilters"
              >
                Limpiar filtros POA
              </button>
            </div>
          </div>
        </form>
        <p
          v-if="notice"
          role="status"
          class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm"
        >
          {{ notice }}
        </p>
        <MunicipalFeedback :error="error" retry @retry="reload" />
        <section v-if="!error" class="kt-card min-w-0" :aria-busy="loading">
          <div class="kt-card-header"><h2 class="kt-card-title">Planes operativos anuales</h2></div>
          <div class="kt-card-table overflow-x-auto">
            <table class="kt-table align-middle">
              <thead>
                <tr>
                  <th>Gestión</th>
                  <th>Título</th>
                  <th>Documentos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="4" class="py-10 text-center">
                    <span role="status">Cargando POA…</span>
                  </td>
                </tr>
                <template v-else
                  ><tr v-for="poa in poas?.data" :key="poa.id">
                    <td class="font-semibold">{{ poa.fiscal_year }}</td>
                    <td>{{ poa.title ?? 'Sin título' }}</td>
                    <td>{{ poa.documents_count ?? 'No informado' }}</td>
                    <td>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-if="writable && auth.hasPermission('municipal.poas.update')"
                          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                          type="button"
                          :aria-label="`Editar POA ${poa.fiscal_year}`"
                          @click="edit(poa)"
                        >
                          Editar
                        </button>
                        <RouterLink
                          :to="{
                            name: 'municipal.poas.show',
                            params: { municipalityId, poaId: poa.id },
                          }"
                          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                          :aria-label="`Abrir POA ${poa.fiscal_year}`"
                          >Detalle y documentos</RouterLink
                        >
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!poas?.data.length">
                    <td colspan="4" class="py-10 text-center text-muted-foreground">
                      No hay POA para este municipio y estos filtros.
                    </td>
                  </tr></template
                >
              </tbody>
            </table>
          </div>
          <TerritoryPagination
            :meta="poas?.meta ?? null"
            :loading="loading"
            label="Paginación de POA"
            class="kt-card-footer"
            @page="page = $event"
          />
        </section>
      </template>
    </div>
    <PoaFormModal
      v-if="formOpen && municipalityId !== null"
      :key="`${municipalityId}-${editing?.id ?? 'new'}`"
      :municipality-id="municipalityId"
      :municipality-name="municipalityName"
      :poa="editing"
      @close="formOpen = false"
      @busy="busy = $event"
      @saved="saved"
    />
  </div>
</template>
