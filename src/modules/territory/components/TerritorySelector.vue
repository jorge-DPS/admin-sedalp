<script setup lang="ts">
import { ref, useId } from 'vue'
import TerritoryCatalogSelect from './TerritoryCatalogSelect.vue'
import MunicipalitySelect from './MunicipalitySelect.vue'
import type { Municipality } from '../types/territory.types'

const emit = defineEmits<{ municipalityChange: [value: Municipality | null] }>()

withDefaults(
  defineProps<{
    compact?: boolean
    withMunicipality?: boolean
    active?: boolean
    disabled?: boolean
  }>(),
  {
    withMunicipality: true,
    active: undefined,
  },
)
const regionId = defineModel<number | null>('regionId', { default: null })
const provinceId = defineModel<number | null>('provinceId', { default: null })
const municipalityId = defineModel<number | null>('municipalityId', { default: null })
const id = useId()
const provinceLoading = ref(false)
</script>

<template>
  <div :class="compact ? 'contents' : 'grid min-w-0 gap-4 sm:grid-cols-2'">
    <TerritoryCatalogSelect
      :id="`${id}-region`"
      v-model="regionId"
      kind="regions"
      :disabled="disabled"
    />
    <TerritoryCatalogSelect
      :id="`${id}-province`"
      v-model="provinceId"
      kind="provinces"
      :region-id="regionId"
      @busy="provinceLoading = $event"
      :disabled="disabled"
    />
    <p v-if="!compact" class="text-xs leading-5 text-muted-foreground sm:col-span-2">
      Las provincias se relacionan con la región a través de sus municipios. Una provincia puede
      incluir municipios de distintas regiones.
    </p>
    <MunicipalitySelect
      v-if="withMunicipality"
      :id="`${id}-municipality`"
      v-model="municipalityId"
      @selection="emit('municipalityChange', $event)"
      :region-id="regionId"
      :province-id="provinceId"
      :active="active"
      :disabled="disabled || provinceLoading"
      class="sm:col-span-2"
    />
  </div>
</template>
