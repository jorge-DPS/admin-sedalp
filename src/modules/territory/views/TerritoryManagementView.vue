<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AccessPageHeader from '@/components/ui/AccessPageHeader.vue'
import TerritorySelector from '../components/TerritorySelector.vue'
import TerritoryPagination from '../components/TerritoryPagination.vue'
import MunicipalityAdministrationDialog from '../components/MunicipalityAdministrationDialog.vue'
import { useMunicipalities } from '../composables/useMunicipalities'

const regionId = ref<number | null>(null)
const provinceId = ref<number | null>(null)
const searchInput = ref('')
const search = ref('')
const state = ref<'active' | 'inactive' | 'all'>('active')
const page = ref(1)
const detailId = ref<number | null>(null)
const filters = computed(() => ({
  region_id: regionId.value ?? undefined,
  province_id: provinceId.value ?? undefined,
  search: search.value,
  active: state.value === 'all' ? undefined : state.value === 'active',
  page: page.value,
  per_page: 15,
}))
const { municipalities, meta, loading, error, permitted, reload } = useMunicipalities(filters)

watch(
  [regionId, provinceId, state],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

function applySearch(): void {
  page.value = 1
  search.value = searchInput.value.trim()
}

function clearFilters(): void {
  regionId.value = null
  provinceId.value = null
  searchInput.value = ''
  search.value = ''
  state.value = 'active'
  page.value = 1
}
</script>

<template>
  <div class="w-full min-w-0 max-w-[100vw] lg:max-w-[calc(100vw-var(--sidebar-width))]">
    <AccessPageHeader
      title="Consulta territorial"
      description="Consulta municipios, provincias y regiones vigentes para la planificación territorial."
      :action-label="permitted ? 'Actualizar' : ''"
      action-icon="ki-arrows-circle"
      @action="reload"
    />
    <div class="kt-container-fixed flex flex-col gap-5 pb-10">
      <div v-if="!permitted" role="alert" class="kt-card">
        <p class="kt-card-content text-sm text-destructive">
          No tienes permiso para consultar municipios.
        </p>
      </div>
      <template v-else>
        <section class="kt-card" aria-labelledby="territory-filters-title">
          <div class="kt-card-header">
            <h2 id="territory-filters-title" class="kt-card-title">Filtros territoriales</h2>
          </div>
          <form class="kt-card-content flex flex-col gap-5" @submit.prevent="applySearch">
            <TerritorySelector
              v-model:region-id="regionId"
              v-model:province-id="provinceId"
              :with-municipality="false"
            />
            <div
              class="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_auto]"
            >
              <div class="flex min-w-0 flex-col gap-2">
                <label for="territory-search" class="text-sm font-medium text-mono"
                  >Buscar municipio</label
                >
                <input
                  id="territory-search"
                  v-model="searchInput"
                  type="search"
                  class="kt-input w-full text-foreground"
                  placeholder="Nombre o código oficial"
                  maxlength="150"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="territory-status" class="text-sm font-medium text-mono"
                  >Estado del municipio</label
                >
                <select
                  id="territory-status"
                  v-model="state"
                  class="kt-select w-full text-foreground"
                >
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="all">Todos</option>
                </select>
              </div>
              <div class="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
                <button class="kt-btn kt-btn-primary" type="submit">
                  <i class="ki-filled ki-magnifier" aria-hidden="true" /> Buscar
                </button>
                <button
                  class="kt-btn kt-btn-outline text-foreground"
                  type="button"
                  @click="clearFilters"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </form>
        </section>
        <div
          v-if="error"
          role="alert"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <p>{{ error.message }}</p>
          <button
            v-if="error.status !== 403"
            class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
            type="button"
            @click="reload"
          >
            Reintentar municipios
          </button>
        </div>
        <section
          v-if="!error"
          class="kt-card"
          aria-labelledby="territory-results-title"
          :aria-busy="loading"
        >
          <div class="kt-card-header flex-wrap gap-2">
            <h2 id="territory-results-title" class="kt-card-title">Municipios</h2>
            <span v-if="meta" class="text-sm text-muted-foreground"
              >{{ meta.total }} registros</span
            >
          </div>
          <div class="kt-card-table overflow-x-auto">
            <table class="kt-table align-middle">
              <thead>
                <tr>
                  <th>Municipio</th>
                  <th>Código oficial</th>
                  <th>Provincia</th>
                  <th>Región vigente</th>
                  <th>Estado</th>
                  <th class="text-right">Consulta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="py-12 text-center text-muted-foreground">
                    <span role="status">Cargando municipios…</span>
                  </td>
                </tr>
                <template v-else>
                  <tr v-for="municipality in municipalities" :key="municipality.id">
                    <td class="font-medium text-mono">{{ municipality.name }}</td>
                    <td>{{ municipality.official_code ?? 'Sin código' }}</td>
                    <td>{{ municipality.province?.name ?? 'Sin información' }}</td>
                    <td>{{ municipality.region?.name ?? 'Sin información' }}</td>
                    <td>
                      <span
                        class="kt-badge kt-badge-outline"
                        :class="municipality.active ? 'kt-badge-success' : 'kt-badge-secondary'"
                      >
                        {{ municipality.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button
                        class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                        type="button"
                        :aria-label="`Administrar ${municipality.name}`"
                        @click="detailId = municipality.id"
                      >
                        Administrar
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!municipalities.length">
                    <td colspan="6" class="py-12 text-center text-muted-foreground">
                      No se encontraron municipios para estos filtros.
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <TerritoryPagination
            class="kt-card-footer"
            :meta="meta"
            :loading="loading"
            @page="page = $event"
          />
        </section>
      </template>
    </div>
    <MunicipalityAdministrationDialog
      v-if="detailId !== null"
      :key="detailId"
      :municipality-id="detailId"
      @close="detailId = null"
    />
  </div>
</template>
