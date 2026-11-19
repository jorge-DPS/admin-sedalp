<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import { positiveId } from '../utils/municipal.format'
import type { MunicipalPoa } from '../types/poa.types'
import MunicipalFeedback from './MunicipalFeedback.vue'
import MunicipalPageHeader from './MunicipalPageHeader.vue'

const props = defineProps<{
  municipalityId: number
  writable: boolean
  saved?: { poaId: number; created: boolean }
}>()
const emit = defineEmits<{ create: []; edit: [MunicipalPoa] }>()
const auth = useAuthStore()
const route = useRoute()
const routeYear = positiveId(route.query.poaYear)
const year = ref(routeYear && routeYear >= 1900 && routeYear <= 2100 ? routeYear : undefined)
const search = ref(
  typeof route.query.poaSearch === 'string' ? route.query.poaSearch.slice(0, 150) : '',
)
const yearInput = ref(year.value === undefined ? '' : String(year.value))
const searchInput = ref(search.value)
const page = ref(positiveId(route.query.poaPage) ?? 1)
const hasFilters = computed(() => year.value !== undefined || search.value !== '')
const filters = computed(() => ({
  fiscal_year: year.value,
  search: search.value,
  page: page.value,
  per_page: 15,
}))
const detailQuery = computed(() => ({
  ...route.query,
  poaYear: year.value === undefined ? undefined : String(year.value),
  poaSearch: search.value || undefined,
  poaPage: page.value === 1 ? undefined : String(page.value),
}))
const canCreate = computed(() => props.writable && auth.hasPermission('municipal.poas.create'))
const canUpdate = computed(() => props.writable && auth.hasPermission('municipal.poas.update'))
const {
  data: poas,
  loading,
  error,
  permitted,
  reload,
} = useMunicipalQuery(
  'municipal.poas.view',
  () => [props.municipalityId, filters.value, props.saved],
  (signal) => poasApi.index(props.municipalityId, filters.value, signal),
)
function filter() {
  page.value = 1
  year.value = yearInput.value === '' ? undefined : Number(yearInput.value)
  search.value = searchInput.value.trim()
}
function clear() {
  yearInput.value = ''
  searchInput.value = ''
  filter()
}
</script>

<template>
  <section class="min-w-0 max-w-5xl space-y-3.5" aria-labelledby="poas-heading">
    <p v-if="!permitted" role="status" class="text-sm text-muted-foreground">
      No tienes permiso para consultar POA municipales.
    </p>
    <template v-else>
      <MunicipalPageHeader title="POA municipales" heading-id="poas-heading">
        <template #actions>
          <button
            v-if="canCreate"
            class="kt-btn kt-btn-sm kt-btn-primary"
            type="button"
            @click="emit('create')"
          >
            <i class="ki-filled ki-plus" aria-hidden="true" />Registrar POA
          </button>
        </template>
      </MunicipalPageHeader>
      <div
        v-if="saved"
        role="status"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm"
      >
        <span
          ><i class="ki-filled ki-check-circle me-1.5" aria-hidden="true" />{{
            saved.created ? 'POA registrado.' : 'POA actualizado.'
          }}</span
        >
        <RouterLink
          v-if="saved.created"
          class="kt-btn kt-btn-sm kt-btn-ghost"
          :to="{
            name: 'territory.poas.show',
            params: { municipalityId, poaId: saved.poaId },
            query: detailQuery,
          }"
          >Ver documentos<i class="ki-filled ki-arrow-right" aria-hidden="true"
        /></RouterLink>
      </div>
      <div class="kt-card min-w-0 overflow-hidden rounded-xl">
        <form
          aria-label="Filtros de POA"
          class="grid items-end gap-2.5 border-b border-border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_8rem] md:grid-cols-[minmax(0,1fr)_9rem_auto]"
          @submit.prevent="filter"
        >
          <label class="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Título del POA
            <span class="kt-input kt-input-sm w-full">
              <i class="ki-filled ki-magnifier" aria-hidden="true" />
              <input
                v-model="searchInput"
                name="poa-search"
                type="search"
                maxlength="150"
                placeholder="Buscar por título…"
              />
            </span>
          </label>
          <label class="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Gestión fiscal
            <input
              v-model="yearInput"
              name="fiscal-year"
              type="number"
              min="1900"
              max="2100"
              step="1"
              class="kt-input kt-input-sm w-full"
              placeholder="Todas"
            />
          </label>
          <div class="flex items-center gap-1.5">
            <button class="kt-btn kt-btn-sm kt-btn-outline" type="submit">Filtrar</button>
            <button
              v-if="hasFilters || searchInput || yearInput"
              class="kt-btn kt-btn-sm kt-btn-ghost"
              type="button"
              @click="clear"
            >
              Limpiar
            </button>
          </div>
        </form>
        <MunicipalFeedback :error="error" retry class="m-5" @retry="reload" />
        <div v-if="!error" :aria-busy="loading">
          <table class="kt-table w-full table-fixed align-middle">
            <caption class="sr-only">
              Planes operativos anuales del municipio
            </caption>
            <thead>
              <tr>
                <th scope="col" class="hidden w-28 sm:table-cell">Gestión</th>
                <th scope="col">Plan operativo</th>
                <th scope="col" class="hidden w-32 md:table-cell">Documentos</th>
                <th scope="col" class="w-24 text-right sm:w-44">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="p-8 text-center text-muted-foreground">
                  <span role="status">Cargando POA…</span>
                </td>
              </tr>
              <template v-else>
                <tr v-for="poa in poas?.data" :key="poa.id">
                  <td class="hidden font-semibold tabular-nums sm:table-cell">
                    {{ poa.fiscal_year }}
                  </td>
                  <th scope="row" class="whitespace-normal text-left font-medium">
                    <span class="mb-1 block text-xs text-muted-foreground sm:hidden"
                      >Gestión {{ poa.fiscal_year }}</span
                    >
                    <span class="block break-words text-foreground">{{
                      poa.title || 'Sin título'
                    }}</span>
                    <span
                      v-if="poa.documents_count !== undefined"
                      class="mt-1 block text-xs font-normal text-muted-foreground md:hidden"
                    >
                      {{ poa.documents_count }}
                      {{ poa.documents_count === 1 ? 'documento' : 'documentos' }}
                    </span>
                  </th>
                  <td class="hidden text-muted-foreground tabular-nums md:table-cell">
                    {{ poa.documents_count ?? '—' }}
                  </td>
                  <td>
                    <div class="flex items-center justify-end gap-1">
                      <button
                        v-if="canUpdate"
                        type="button"
                        class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost"
                        :title="'Editar POA ' + poa.fiscal_year"
                        :aria-label="'Editar POA ' + poa.fiscal_year"
                        @click="emit('edit', poa)"
                      >
                        <i class="ki-filled ki-pencil" aria-hidden="true" />
                      </button>
                      <RouterLink
                        class="kt-btn kt-btn-sm kt-btn-ghost"
                        :aria-label="'Ver documentos del POA ' + poa.fiscal_year"
                        :title="'Ver documentos del POA ' + poa.fiscal_year"
                        :to="{
                          name: 'territory.poas.show',
                          params: { municipalityId, poaId: poa.id },
                          query: detailQuery,
                        }"
                      >
                        <span class="hidden sm:inline">Documentos</span>
                        <i class="ki-filled ki-arrow-right" aria-hidden="true" />
                      </RouterLink>
                    </div>
                  </td>
                </tr>
                <tr v-if="!poas?.data.length">
                  <td colspan="4" class="px-4 py-6 text-center">
                    <p class="font-medium">
                      {{ hasFilters ? 'No se encontraron POA' : 'Todavía no hay POA registrados' }}
                    </p>
                    <p v-if="hasFilters" class="mt-1.5 text-sm text-muted-foreground">
                      Prueba otra gestión o cambia el título de búsqueda.
                    </p>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <TerritoryPagination
            :meta="poas?.meta ?? null"
            :loading="loading"
            label="Paginación de POA"
            class="kt-card-footer px-3 py-2.5"
            @page="page = $event"
          />
        </div>
      </div>
    </template>
  </section>
</template>
