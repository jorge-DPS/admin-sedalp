<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMunicipality } from '../composables/useMunicipality'
import MunicipalDialog from '@/modules/municipal/components/MunicipalDialog.vue'
import MunicipalFeedback from '@/modules/municipal/components/MunicipalFeedback.vue'
import MunicipalPoaWorkspace from '@/modules/municipal/components/MunicipalPoaWorkspace.vue'
import MunicipalitySummary from './MunicipalitySummary.vue'
const props = defineProps<{ municipalityId: number }>()
const emit = defineEmits<{ close: [] }>()
const auth = useAuthStore()
const { municipality, loading, error, reload } = useMunicipality(() => props.municipalityId)
const tab = ref<'summary' | 'poas'>('summary')
const visitedPoas = ref(false)
const busy = ref(false)
const dirty = ref(false)
const confirmClose = ref(false)
const continueButton = ref<HTMLButtonElement>()
const id = useId()
watch(dirty, (value) => {
  if (!value) confirmClose.value = false
})
function discard(): void {
  if (!busy.value) emit('close')
}
function selectTab(value: 'summary' | 'poas'): void {
  if (busy.value || (value === 'poas' && !auth.hasPermission('municipal.poas.view'))) return
  tab.value = value
  if (value === 'poas') visitedPoas.value = true
}
async function keydown(event: KeyboardEvent): Promise<void> {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || busy.value) return
  event.preventDefault()
  const tabs: Array<'summary' | 'poas'> = auth.hasPermission('municipal.poas.view')
    ? ['summary', 'poas']
    : ['summary']
  const last = tabs[tabs.length - 1] ?? 'summary'
  const next =
    event.key === 'Home'
      ? 'summary'
      : event.key === 'End'
        ? last
        : tab.value === 'summary'
          ? last
          : 'summary'
  selectTab(next)
  await nextTick()
  document.getElementById(`${id}-${next}-tab`)?.focus()
}
async function close(): Promise<void> {
  if (busy.value) return
  if (!dirty.value) {
    emit('close')
    return
  }
  confirmClose.value = true
  await nextTick()
  continueButton.value?.focus()
}
function canNavigate(): boolean {
  return (!busy.value && !dirty.value) || !auth.isAuthenticated
}
onBeforeRouteLeave(canNavigate)
onBeforeRouteUpdate(canNavigate)
</script>
<template>
  <MunicipalDialog
    :title="municipality?.name ?? 'Administrar municipio'"
    size="wide"
    :busy="busy"
    @close="close"
  >
    <template #description>
      <p v-if="municipality" class="mt-1 text-sm text-muted-foreground">
        {{ municipality.province?.name ?? 'Provincia no informada' }} ·
        {{ municipality.region?.name ?? 'Región no informada' }} ·
        {{ municipality.active ? 'Activo' : 'Inactivo' }}
      </p>
    </template>
    <div class="flex min-w-0 flex-col gap-5">
      <div
        v-if="confirmClose"
        role="alert"
        class="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
      >
        <p>
          Hay un formulario abierto. Si cierras la ficha, perderás los datos que no hayas guardado.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            ref="continueButton"
            class="kt-btn kt-btn-primary"
            type="button"
            @click="confirmClose = false"
          >
            Continuar editando</button
          ><button
            class="kt-btn kt-btn-outline text-foreground"
            type="button"
            :disabled="busy"
            @click="discard"
          >
            Descartar y cerrar
          </button>
        </div>
      </div>
      <p v-if="loading" role="status" class="py-8 text-center text-muted-foreground">
        Cargando municipio…
      </p>
      <MunicipalFeedback :error="error" retry @retry="reload" />
      <template v-if="municipality">
        <div
          role="tablist"
          aria-label="Administración del municipio"
          class="flex flex-wrap gap-2 border-b border-border pb-3"
          @keydown="keydown"
        >
          <button
            :id="`${id}-summary-tab`"
            role="tab"
            type="button"
            :aria-selected="tab === 'summary'"
            :aria-controls="`${id}-summary-panel`"
            :tabindex="tab === 'summary' ? 0 : -1"
            :disabled="busy"
            class="kt-btn"
            :class="tab === 'summary' ? 'kt-btn-primary' : 'kt-btn-outline text-foreground'"
            @click="selectTab('summary')"
          >
            Resumen
          </button>
          <button
            :id="`${id}-poas-tab`"
            role="tab"
            type="button"
            :aria-selected="tab === 'poas'"
            :aria-controls="`${id}-poas-panel`"
            :tabindex="tab === 'poas' ? 0 : -1"
            :disabled="busy || !auth.hasPermission('municipal.poas.view')"
            class="kt-btn"
            :class="tab === 'poas' ? 'kt-btn-primary' : 'kt-btn-outline text-foreground'"
            @click="selectTab('poas')"
          >
            POA municipales
          </button>
          <button
            role="tab"
            type="button"
            disabled
            aria-disabled="true"
            aria-selected="false"
            class="kt-btn kt-btn-ghost text-muted-foreground"
          >
            Autoridades · Próximamente
          </button>
        </div>
        <p v-if="!auth.hasPermission('municipal.poas.view')" class="text-xs text-muted-foreground">
          No tienes permiso para consultar POA municipales.
        </p>
        <div
          :id="`${id}-summary-panel`"
          v-show="tab === 'summary'"
          role="tabpanel"
          :aria-labelledby="`${id}-summary-tab`"
        >
          <MunicipalitySummary :municipality="municipality" />
        </div>
        <div
          v-if="visitedPoas"
          :id="`${id}-poas-panel`"
          v-show="tab === 'poas'"
          role="tabpanel"
          :aria-labelledby="`${id}-poas-tab`"
        >
          <MunicipalPoaWorkspace
            :key="municipality.id"
            :municipality-id="municipality.id"
            :municipality="municipality"
            @busy="busy = $event"
            @dirty="dirty = $event"
          />
        </div>
      </template>
    </div>
  </MunicipalDialog>
</template>
