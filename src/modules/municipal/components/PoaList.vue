<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import { poasApi } from '../api/poas.api'
import { useMunicipalQuery } from '../composables/useMunicipalQuery'
import type { MunicipalPoa } from '../types/poa.types'
import MunicipalFeedback from './MunicipalFeedback.vue'
const props = defineProps<{ municipalityId: number; writable: boolean }>()
const emit = defineEmits<{ create: []; edit: [poa: MunicipalPoa]; open: [poa: MunicipalPoa] }>()
const auth = useAuthStore()
const yearInput = ref('')
const searchInput = ref('')
const year = ref<number | undefined>()
const search = ref('')
const page = ref(1)
const revision = ref(0)
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
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Planes operativos anuales</h3>
        <button
          v-if="writable && auth.hasPermission('municipal.poas.create')"
          class="kt-btn kt-btn-primary"
          type="button"
          @click="emit('create')"
        >
          Registrar POA
        </button>
      </div>
      <form
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_minmax(0,1fr)_auto]"
        @submit.prevent="filter"
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
            maxlength="150"
            class="kt-input text-foreground"
        /></label>
        <div class="flex flex-wrap items-end gap-2">
          <button class="kt-btn kt-btn-primary" type="submit">Filtrar POA</button
          ><button class="kt-btn kt-btn-outline text-foreground" type="button" @click="clear">
            Limpiar filtros POA
          </button>
        </div>
      </form>
      <MunicipalFeedback :error="error" retry @retry="reload" />
      <div v-if="!error" class="kt-card min-w-0" :aria-busy="loading">
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
                        @click="emit('edit', poa)"
                      >
                        Editar
                      </button>
                      <button
                        class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
                        type="button"
                        :aria-label="`Abrir POA ${poa.fiscal_year}`"
                        @click="emit('open', poa)"
                      >
                        Detalle y documentos
                      </button>
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
      </div>
    </template>
  </div>
</template>
