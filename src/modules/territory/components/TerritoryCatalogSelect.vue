<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTerritoryCatalog } from '../composables/useTerritoryCatalog'
import { useRegionProvinces } from '../composables/useRegionProvinces'
import type { TerritoryCatalogKind } from '../types/territory.types'
const props = withDefaults(
  defineProps<{
    id: string
    kind: TerritoryCatalogKind
    modelValue: number | null
    active?: boolean
    disabled?: boolean
    regionId?: number | null
  }>(),
  { active: undefined, regionId: null },
)
const emit = defineEmits<{ 'update:modelValue': [value: number | null]; busy: [value: boolean] }>()
const catalog = useTerritoryCatalog(
  () => props.kind,
  () => props.active,
)
const region = computed(() => (props.kind === 'provinces' ? props.regionId : null))
const related = useRegionProvinces(region)
const items = computed(() =>
  region.value === null
    ? catalog.items.value
    : catalog.items.value.filter((item) => related.ids.value?.has(item.id)),
)
const loading = computed(() => catalog.loading.value || related.loading.value)
const loaded = computed(
  () => catalog.loaded.value && (region.value === null || related.ids.value !== null),
)
const error = computed(() => catalog.error.value || related.error.value)
const permitted = catalog.permitted
const label = computed(() => (props.kind === 'regions' ? 'Región' : 'Provincia'))
const plural = computed(() => (props.kind === 'regions' ? 'regiones' : 'provincias'))
const selectedId = computed({
  get: () => props.modelValue,
  set: (value: number | null) => emit('update:modelValue', value),
})
const selectionMissing = computed(
  () => props.modelValue !== null && !items.value.some((item) => item.id === props.modelValue),
)
watch(loading, (value) => emit('busy', value), { immediate: true, flush: 'sync' })
watch(
  () => [loaded.value, items.value, props.modelValue],
  () => {
    if (loaded.value && selectionMissing.value) emit('update:modelValue', null)
  },
)
function reload(): void {
  if (catalog.error.value || !catalog.loaded.value) void catalog.reload()
  if (related.error.value) void related.reload()
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <label :for="id" class="text-sm font-medium text-mono">{{ label }}</label>
    <select
      :id="id"
      v-model="selectedId"
      class="kt-select w-full text-foreground"
      :disabled="disabled || !permitted || loading || Boolean(error)"
      :aria-busy="loading"
      :aria-describedby="`${id}-status`"
    >
      <option :value="null">
        {{ !permitted ? 'Catálogo no autorizado' : loading ? 'Cargando…' : `Todas las ${plural}` }}
      </option>
      <option v-if="selectionMissing" :value="modelValue">{{ label }} #{{ modelValue }}</option>
      <option v-for="item in items" :key="item.id" :value="item.id">
        {{ item.name }}{{ item.active ? '' : ' · Inactiva' }}
      </option>
    </select>
    <div :id="`${id}-status`" class="text-xs text-muted-foreground" aria-live="polite">
      <span v-if="!permitted">No tienes permiso para consultar {{ plural }}.</span>
      <div
        v-else-if="error"
        role="alert"
        class="flex flex-wrap items-center gap-2 text-destructive"
      >
        <span>{{ error.message }}</span>
        <button
          v-if="error.status !== 403"
          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
          type="button"
          @click="reload"
        >
          Reintentar {{ plural }}
        </button>
      </div>
      <span v-else-if="loaded && !items.length">No hay {{ plural }} disponibles.</span>
    </div>
  </div>
</template>
