<script setup lang="ts">
import { useMunicipality } from '../composables/useMunicipality'
import MunicipalDialog from '@/modules/municipal/components/MunicipalDialog.vue'
import MunicipalFeedback from '@/modules/municipal/components/MunicipalFeedback.vue'
import MunicipalitySummary from './MunicipalitySummary.vue'
const props = defineProps<{ municipalityId: number }>()
const emit = defineEmits<{ close: [] }>()
const { municipality, loading, error, reload } = useMunicipality(() => props.municipalityId)
</script>
<template>
  <MunicipalDialog title="Detalle del municipio" @close="emit('close')">
    <p v-if="loading" role="status">Cargando municipio…</p>
    <MunicipalFeedback :error="error" retry @retry="reload" />
    <MunicipalitySummary v-if="municipality" :municipality="municipality" />
  </MunicipalDialog>
</template>
