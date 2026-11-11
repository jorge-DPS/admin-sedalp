<script setup lang="ts">
import { computed } from 'vue'
import type { Municipality } from '../types/territory.types'
import { municipalDate } from '@/modules/municipal/utils/municipal.format'
const props = defineProps<{ municipality: Municipality }>()
const fields = computed(() => [
  { label: 'Nombre', value: props.municipality.name },
  { label: 'Código oficial', value: props.municipality.official_code ?? 'Sin código' },
  { label: 'Provincia', value: props.municipality.province?.name ?? 'Sin información' },
  { label: 'Región vigente', value: props.municipality.region?.name ?? 'Sin información' },
  { label: 'Estado', value: props.municipality.active ? 'Activo' : 'Inactivo' },
  { label: 'Fecha de registro', value: municipalDate(props.municipality.created_at) },
  { label: 'Última actualización', value: municipalDate(props.municipality.updated_at) },
])
</script>
<template>
  <dl class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    <div
      v-for="field in fields"
      :key="field.label"
      class="min-w-0 rounded-xl border border-border p-4"
    >
      <dt class="text-xs text-muted-foreground">{{ field.label }}</dt>
      <dd class="mt-2 break-words text-sm font-medium">{{ field.value }}</dd>
    </div>
  </dl>
</template>
