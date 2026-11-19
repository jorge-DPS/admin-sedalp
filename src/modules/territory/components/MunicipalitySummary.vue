<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/shared/api/errors'
import { municipalDate } from '@/modules/municipal/utils/municipal.format'
import MunicipalFeedback from '@/modules/municipal/components/MunicipalFeedback.vue'
import MunicipalPageHeader from '@/modules/municipal/components/MunicipalPageHeader.vue'
import { territoryApi } from '../api/territory.api'
import { getTerritoryError } from '../api/territory.errors'
import type { Municipality } from '../types/territory.types'

const props = defineProps<{ municipality: Municipality }>()
const emit = defineEmits<{ busy: [boolean]; municipalityUpdated: [Municipality] }>()
const auth = useAuthStore()
const saving = ref(false)
const error = ref<ApiError | null>(null)

async function setActive(event: Event) {
  const control = event.currentTarget as HTMLInputElement
  const active = control.checked
  control.checked = props.municipality.active
  if (saving.value || !auth.hasPermission('municipalities.update')) return
  saving.value = true
  emit('busy', true)
  error.value = null
  try {
    const municipality = await territoryApi.setMunicipalityActive(props.municipality.id, active)
    emit('municipalityUpdated', municipality)
  } catch (failure) {
    error.value = getTerritoryError(failure)
  } finally {
    saving.value = false
    emit('busy', false)
  }
}
</script>

<template>
  <section aria-labelledby="municipality-summary" class="min-w-0 max-w-3xl space-y-3.5">
    <MunicipalPageHeader title="Ficha municipal" heading-id="municipality-summary" />
    <div class="grid items-start gap-3 sm:grid-cols-2">
      <section class="kt-card min-w-0 rounded-xl px-4 py-3.5">
        <h3 class="flex items-center gap-2 text-sm font-semibold">
          <span
            class="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
            aria-hidden="true"
            ><i class="ki-filled ki-document"
          /></span>
          Identificación
        </h3>
        <dl class="mt-2.5 divide-y divide-border text-sm">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
            <dt class="text-muted-foreground">Nombre oficial</dt>
            <dd class="min-w-0 break-words font-medium">{{ municipality.name }}</dd>
          </div>
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
            <dt class="text-muted-foreground">Código oficial</dt>
            <dd class="min-w-0 break-words font-medium tabular-nums">
              {{ municipality.official_code || 'No informado' }}
            </dd>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 last:pb-0">
            <dt class="text-muted-foreground">Estado administrativo</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <label
                v-if="auth.hasPermission('municipalities.update')"
                class="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  role="switch"
                  class="kt-switch"
                  :checked="municipality.active"
                  :disabled="saving"
                  :aria-busy="saving"
                  @change="setActive"
                />
                <span class="sr-only">Municipio activo</span>
              </label>
              <span aria-live="polite" class="font-medium">
                {{ saving ? 'Guardando…' : municipality.active ? 'Activo' : 'Inactivo' }}
              </span>
            </dd>
          </div>
        </dl>
        <MunicipalFeedback v-if="error" :error="error" class="mt-3" />
      </section>
      <section class="kt-card min-w-0 rounded-xl px-4 py-3.5">
        <h3 class="flex items-center gap-2 text-sm font-semibold">
          <span
            class="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
            aria-hidden="true"
            ><i class="ki-filled ki-geolocation"
          /></span>
          Ubicación territorial
        </h3>
        <dl class="mt-2.5 divide-y divide-border text-sm">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
            <dt class="text-muted-foreground">Provincia</dt>
            <dd class="min-w-0 break-words font-medium">
              {{ municipality.province?.name || 'No informada' }}
            </dd>
          </div>
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 last:pb-0">
            <dt class="text-muted-foreground">Región</dt>
            <dd class="min-w-0 break-words font-medium">
              {{ municipality.region?.name || 'No informada' }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
    <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
      <div class="flex flex-wrap gap-2">
        <dt class="text-muted-foreground">Fecha de registro</dt>
        <dd>{{ municipalDate(municipality.created_at) }}</dd>
      </div>
      <div class="flex flex-wrap gap-2">
        <dt class="text-muted-foreground">Última actualización</dt>
        <dd>{{ municipalDate(municipality.updated_at) }}</dd>
      </div>
    </dl>
  </section>
</template>
