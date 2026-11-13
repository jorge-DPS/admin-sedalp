<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AccessPageHeader from '@/components/ui/AccessPageHeader.vue'
import TerritorySelector from '../components/TerritorySelector.vue'
import TerritoryPagination from '../components/TerritoryPagination.vue'
import { useRoute, useRouter } from 'vue-router'
import { positiveId } from '@/modules/municipal/utils/municipal.format'
import { useMunicipalities } from '../composables/useMunicipalities'

const route = useRoute()
const router = useRouter()
const regionId = ref(positiveId(route.query.region))
const provinceId = ref(positiveId(route.query.province))
const searchInput = ref(typeof route.query.search === 'string' ? route.query.search : '')
const search = ref(searchInput.value)
const state = ref<'active' | 'inactive' | 'all'>(
  route.query.state === 'all' || route.query.state === 'inactive' ? route.query.state : 'active',
)
const page = ref(positiveId(route.query.page) ?? 1)
const listQuery = computed(() => ({
  region: regionId.value ?? undefined,
  province: provinceId.value ?? undefined,
  search: search.value || undefined,
  state: state.value === 'active' ? undefined : state.value,
  page: page.value === 1 ? undefined : page.value,
}))
watch(listQuery, (query) => {
  if (route.name === 'territory.municipalities.index') void router.replace({ query })
})
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
      title="Municipios"
      description="Busca un municipio para consultar su ficha, sus POA y sus autoridades."
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
          <form
            class="kt-card-content grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.8fr]"
            @submit.prevent="applySearch"
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
            <TerritorySelector
              v-model:region-id="regionId"
              v-model:province-id="provinceId"
              :with-municipality="false"
              compact
            />
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
            <div class="flex flex-wrap gap-2 justify-end sm:col-span-2 xl:col-span-4">
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
            <h2 id="territory-results-title" class="kt-card-title">Resultados</h2>
            <span v-if="meta" class="text-sm text-muted-foreground"
              >{{ meta.total }} registros</span
            >
          </div>
          <div class="kt-card-table overflow-x-auto">
            <table class="kt-table align-middle">
              <thead>
                <tr>
                  <th>Municipio</th>
                  <th>Provincia y región</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="4" class="py-12 text-center text-muted-foreground">
                    <span role="status">Cargando municipios…</span>
                  </td>
                </tr>
                <template v-else>
                  <tr v-for="municipality in municipalities" :key="municipality.id">
                    <td>
                      <p class="font-medium text-mono">{{ municipality.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ municipality.official_code ?? 'Sin código' }}
                      </p>
                    </td>
                    <td>
                      <p>{{ municipality.province?.name ?? 'Sin información' }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ municipality.region?.name ?? 'Sin información' }}
                      </p>
                    </td>
                    <td>
                      <span
                        class="kt-badge kt-badge-outline"
                        :class="municipality.active ? 'kt-badge-success' : 'kt-badge-secondary'"
                      >
                        {{ municipality.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <RouterLink
                        class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                        :aria-label="`Administrar ${municipality.name}`"
                        :to="{
                          name: 'territory.municipalities.overview',
                          params: { municipalityId: municipality.id },
                          query: listQuery,
                        }"
                      >
                        Administrar
                      </RouterLink>
                    </td>
                  </tr>
                  <tr v-if="!municipalities.length">
                    <td colspan="4" class="py-12 text-center text-muted-foreground">
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
  </div>
</template>
