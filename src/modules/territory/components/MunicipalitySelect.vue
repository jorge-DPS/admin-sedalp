<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMunicipalities } from '../composables/useMunicipalities'
import { useMunicipality } from '../composables/useMunicipality'
import TerritoryPagination from './TerritoryPagination.vue'
import type { Municipality } from '../types/territory.types'

const props = withDefaults(
  defineProps<{
    id: string
    modelValue: number | null
    regionId?: number | null
    provinceId?: number | null
    active?: boolean
    disabled?: boolean
  }>(),
  { active: undefined },
)
const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  selection: [value: Municipality | null]
}>()
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const { municipalities, meta, loading, error, permitted, reload } = useMunicipalities(() => ({
  search: search.value,
  region_id: props.regionId ?? undefined,
  province_id: props.provinceId ?? undefined,
  active: props.active,
  per_page: 15,
  page: page.value,
}))
const {
  municipality,
  error: selectionError,
  loading: validating,
} = useMunicipality(() => props.modelValue)
const selected = computed(() =>
  municipality.value?.id === props.modelValue
    ? municipality.value
    : municipalities.value.find((item) => item.id === props.modelValue),
)
watch(selected, (value) => emit('selection', value ?? null), { immediate: true })
const selectionOutsidePage = computed(
  () =>
    props.modelValue !== null && !municipalities.value.some((item) => item.id === props.modelValue),
)
const selectedId = computed({
  get: () => props.modelValue,
  set: (value: number | null) => emit('update:modelValue', value),
})

function applySearch(): void {
  page.value = 1
  search.value = searchInput.value.trim()
}

watch(
  () => [props.regionId, props.provinceId, props.active],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
watch(
  () => [selected.value, props.regionId, props.provinceId, props.active] as const,
  ([item, regionId, provinceId, active]) => {
    if (!item || item.id !== props.modelValue) return
    if (
      (regionId != null && item.region_id !== regionId) ||
      (provinceId != null && item.province_id !== provinceId) ||
      (active !== undefined && item.active !== active)
    )
      emit('update:modelValue', null)
  },
)
watch(selectionError, (failure) => {
  if (failure?.status === 404) emit('update:modelValue', null)
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <div class="flex flex-col gap-2">
      <label :for="`${id}-search`" class="text-sm font-medium text-mono">Buscar municipio</label>
      <div class="flex gap-2">
        <input
          :id="`${id}-search`"
          v-model="searchInput"
          type="search"
          class="kt-input min-w-0 flex-1 text-foreground"
          placeholder="Nombre o código oficial"
          maxlength="150"
          :disabled="disabled || !permitted"
          @keydown.enter.prevent="applySearch"
        />
        <button
          class="kt-btn kt-btn-outline text-foreground"
          type="button"
          :disabled="disabled || !permitted"
          @click="applySearch"
        >
          Buscar
        </button>
      </div>
    </div>
    <label :for="id" class="text-sm font-medium text-mono">Municipio</label>
    <select
      :id="id"
      v-model="selectedId"
      class="kt-select w-full text-foreground"
      :disabled="disabled || !permitted || loading || Boolean(error)"
      :aria-busy="loading || validating"
      :aria-describedby="`${id}-status`"
    >
      <option :value="null">{{ loading ? 'Cargando…' : 'Sin municipio seleccionado' }}</option>
      <option v-if="selectionOutsidePage" :value="modelValue">
        {{ selected?.name ?? `Municipio #${modelValue}` }}
      </option>
      <option v-for="item in municipalities" :key="item.id" :value="item.id">
        {{ item.name }}{{ item.official_code ? ` · ${item.official_code}` : '' }}
      </option>
    </select>
    <div :id="`${id}-status`" class="text-xs text-muted-foreground" aria-live="polite">
      <p v-if="!permitted">No tienes permiso para consultar municipios.</p>
      <div v-else-if="error || selectionError" role="alert" class="text-destructive">
        <p>{{ (error || selectionError)?.message }}</p>
        <button
          v-if="error && error.status !== 403"
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline mt-2 text-foreground"
          @click="reload"
        >
          Reintentar municipios
        </button>
      </div>
      <p v-else-if="!loading && !municipalities.length">No hay municipios para estos filtros.</p>
    </div>
    <TerritoryPagination :meta="meta" :loading="loading || disabled" @page="page = $event" />
  </div>
</template>
