<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import type { MunicipalPoa } from '../types/poa.types'
import MunicipalFeedback from './MunicipalFeedback.vue'
import MunicipalPageHeader from './MunicipalPageHeader.vue'
const props = defineProps<{
  municipalityId: number
  writable: boolean
  selectedId?: number
  disabled?: boolean
}>()
const emit = defineEmits<{ create: []; edit: [poa: MunicipalPoa]; open: [poa: MunicipalPoa] }>()
const auth = useAuthStore()
const yearInput = ref('')
const searchInput = ref('')
const year = ref<number | undefined>()
const search = ref('')
const page = ref(1)
const revision = ref(0)
const hasFilters = computed(() => year.value !== undefined || search.value !== '')
const filters = computed(() => ({
  fiscal_year: year.value,
  search: search.value,
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
  () => [props.municipalityId, filters.value, revision.value],
  (signal) => poasApi.index(props.municipalityId, filters.value, signal),
)
function filter(): void {
  if (props.disabled) return
  page.value = 1
  year.value = yearInput.value === '' ? undefined : Number(yearInput.value)
  search.value = searchInput.value.trim()
}
function clear(): void {
  yearInput.value = ''
  searchInput.value = ''
  filter()
}
function refresh(saved?: MunicipalPoa): void {
  if (saved) {
    clear()
    year.value = saved.fiscal_year
    yearInput.value = String(saved.fiscal_year)
  }
  revision.value += 1
}
defineExpose({ refresh })
</script>
<template>
  <div class="flex min-w-0 flex-col gap-4">
    <p v-if="!permitted" role="status" class="text-sm text-muted-foreground">
      No tienes permiso para consultar POA municipales.
    </p>
    <template v-else>
      <MunicipalPageHeader
        title="POA municipales"
        description="Planes operativos y su documentación por gestión fiscal."
      >
        <template #actions
          ><button
            v-if="writable && auth.hasPermission('municipal.poas.create')"
            :disabled="disabled"
            class="kt-btn kt-btn-primary"
            type="button"
            @click="emit('create')"
          >
            <i class="ki-filled ki-plus" aria-hidden="true" />Registrar POA
          </button></template
        >
      </MunicipalPageHeader>
      <div class="kt-card min-w-0 overflow-hidden">
        <form
          class="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-[9rem_minmax(0,1fr)_auto]"
          @submit.prevent="filter"
        >
          <label class="flex flex-col gap-2 text-sm font-medium"
            >Gestión del POA<input
              v-model="yearInput"
              :disabled="disabled"
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
              :disabled="disabled"
              type="search"
              maxlength="150"
              class="kt-input text-foreground"
          /></label>
          <div class="flex flex-wrap items-end gap-2">
            <button
              class="kt-btn kt-btn-outline text-foreground"
              type="submit"
              :disabled="disabled"
            >
              Filtrar</button
            ><button
              class="kt-btn kt-btn-ghost text-muted-foreground"
              type="button"
              :disabled="disabled"
              @click="clear"
            >
              Limpiar
            </button>
          </div>
        </form>
        <MunicipalFeedback :error="error" retry class="m-5" @retry="reload" />
        <div v-if="!error" class="min-w-0" :aria-busy="loading">
          <p class="border-b border-border px-5 py-2.5 text-xs text-muted-foreground sm:hidden">
            Desliza la tabla para ver todos los datos y acciones.
          </p>
          <div
            class="kt-card-table overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            tabindex="0"
            role="region"
            aria-label="Listado de POA con desplazamiento horizontal"
          >
            <table class="kt-table min-w-[42rem] align-middle">
              <caption class="sr-only">
                Planes operativos anuales del municipio
              </caption>
              <thead>
                <tr>
                  <th scope="col" class="w-32">Gestión fiscal</th>
                  <th scope="col">POA</th>
                  <th scope="col">Documentos</th>
                  <th scope="col" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="4" class="py-10 text-center">
                    <span role="status">Cargando POA…</span>
                  </td>
                </tr>
                <template v-else
                  ><tr
                    v-for="poa in poas?.data"
                    :key="poa.id"
                    :class="selectedId === poa.id ? 'bg-primary/5' : undefined"
                    :aria-current="selectedId === poa.id ? 'true' : undefined"
                  >
                    <th scope="row">
                      <span
                        class="inline-flex rounded-md bg-primary/10 px-3 py-2 text-base font-semibold tabular-nums text-primary"
                        >{{ poa.fiscal_year }}</span
                      >
                    </th>
                    <td class="max-w-96 whitespace-normal break-words font-medium">
                      {{ poa.title || 'Sin título' }}
                    </td>
                    <td class="text-muted-foreground">
                      {{
                        poa.documents_count !== undefined
                          ? poa.documents_count +
                            (poa.documents_count === 1 ? ' documento' : ' documentos')
                          : 'No informado'
                      }}
                    </td>
                    <td>
                      <div class="flex items-center justify-end gap-2">
                        <button
                          v-if="writable && auth.hasPermission('municipal.poas.update')"
                          class="kt-btn kt-btn-icon kt-btn-ghost text-muted-foreground"
                          type="button"
                          :title="`Editar POA ${poa.fiscal_year}`"
                          :aria-label="`Editar POA ${poa.fiscal_year}`"
                          :disabled="disabled"
                          @click="emit('edit', poa)"
                        >
                          <i class="ki-filled ki-pencil" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          class="kt-btn kt-btn-sm kt-btn-ghost text-primary"
                          :disabled="disabled"
                          @click="emit('open', poa)"
                          :aria-label="`Abrir POA ${poa.fiscal_year}`"
                        >
                          Ver documentos<i class="ki-filled ki-arrow-right" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!poas?.data.length">
                    <td colspan="4" class="py-10 text-center text-muted-foreground">
                      <p class="font-medium text-foreground">
                        {{
                          hasFilters ? 'No se encontraron POA' : 'Todavía no hay POA registrados'
                        }}
                      </p>
                      <p class="mt-2">
                        {{
                          hasFilters
                            ? 'Prueba otra gestión o limpia los filtros.'
                            : 'Registra el primer plan operativo para incorporar sus documentos.'
                        }}
                      </p>
                      <button
                        v-if="hasFilters"
                        class="kt-btn kt-btn-sm kt-btn-outline mt-4 text-foreground"
                        type="button"
                        @click="clear"
                      >
                        Limpiar filtros
                      </button>
                    </td>
                  </tr></template
                >
              </tbody>
            </table>
          </div>
          <TerritoryPagination
            :meta="poas?.meta ?? null"
            :loading="loading || disabled"
            label="Paginación de POA"
            class="kt-card-footer"
            @page="page = $event"
          />
        </div>
      </div>
    </template>
  </div>
</template>
