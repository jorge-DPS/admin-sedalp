<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { positiveId } from '@/modules/municipal/utils/municipal.format'
import MunicipalFeedback from '@/modules/municipal/components/MunicipalFeedback.vue'
import { useMunicipality } from '../composables/useMunicipality'

const route = useRoute()
const auth = useAuthStore()
const id = computed(() => positiveId(route.params.municipalityId))
const { municipality, loading, error, reload, permitted } = useMunicipality(id)
const tabs = [
  {
    name: 'territory.municipalities.overview',
    label: 'Resumen',
    permission: 'municipalities.view',
  },
  { name: 'territory.poas.index', label: 'POA municipales', permission: 'municipal.poas.view' },
  { name: 'territory.authorities', label: 'Autoridades', permission: 'municipal.authorities.view' },
]
const busy = ref(false)
const dirty = ref(false)
const blocked = ref('')
const isPoa = computed(() => String(route.name).startsWith('territory.poas.'))
const canRender = computed(() => !!municipality.value || (!permitted.value && isPoa.value))
const context = computed(() =>
  route.name === 'territory.municipalities.overview'
    ? { municipality: municipality.value }
    : {
        municipalityId: id.value,
        municipality: municipality.value,
        ...(route.name === 'territory.authorities' ? { active: true } : {}),
      },
)
function guard() {
  if (!auth.isAuthenticated || (!busy.value && !dirty.value)) return true
  blocked.value = busy.value
    ? 'Espera a que termine la operación.'
    : 'Guarda o cancela los cambios antes de salir.'
  return false
}
function protectReload(event: BeforeUnloadEvent) {
  if (busy.value || dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', protectReload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', protectReload))
onBeforeRouteUpdate(guard)
onBeforeRouteLeave(guard)
watch([busy, dirty], () => {
  if (!busy.value && !dirty.value) blocked.value = ''
})
</script>
<template>
  <div class="kt-container-fixed flex w-full min-w-0 flex-col gap-6 pb-10">
    <header class="grid gap-5">
      <nav
        aria-label="Ruta de navegación"
        class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <span>Territorio</span><span aria-hidden="true">/</span>
        <RouterLink
          v-if="permitted"
          :to="{ name: 'territory.municipalities.index', query: route.query }"
          class="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >Municipios</RouterLink
        ><span v-else>Municipios</span> <span aria-hidden="true">/</span
        ><span>{{ municipality?.name ?? 'Municipio' }}</span> <span aria-hidden="true">/</span
        ><template v-if="route.name === 'territory.poas.show'"
          ><RouterLink
            :to="{
              name: 'territory.poas.index',
              params: { municipalityId: id },
              query: route.query,
            }"
            class="hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >POA municipales</RouterLink
          ><span aria-hidden="true">/</span></template
        ><span aria-current="page">{{ route.meta.title }}</span>
      </nav>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="min-w-0 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
              {{
                municipality?.name ??
                (loading ? 'Cargando municipio…' : 'Municipio ' + (id ?? 'no válido'))
              }}
            </h1>
            <span
              v-if="municipality"
              class="kt-badge kt-badge-outline"
              :class="municipality.active ? 'kt-badge-success' : 'kt-badge-secondary'"
              >{{ municipality.active ? 'Activo' : 'Inactivo' }}</span
            >
          </div>
          <p v-if="municipality" class="mt-2 text-sm text-muted-foreground">
            Provincia: {{ municipality.province?.name ?? 'Sin información' }} · Región:
            {{ municipality.region?.name ?? 'Sin información' }}
          </p>
        </div>
        <RouterLink
          v-if="permitted"
          :to="{ name: 'territory.municipalities.index', query: route.query }"
          class="kt-btn kt-btn-ghost text-muted-foreground"
          ><i class="ki-filled ki-arrow-left" aria-hidden="true" />Volver a municipios</RouterLink
        >
      </div>
    </header>
    <nav
      aria-label="Administración municipal"
      class="kt-tabs kt-tabs-line w-full gap-5 overflow-x-auto sm:gap-8"
    >
      <RouterLink
        v-for="tab in tabs.filter((tab) => auth.hasPermission(tab.permission))"
        :key="tab.name"
        :to="{
          name: tab.name,
          params: { municipalityId: route.params.municipalityId },
          query: route.query,
        }"
        :aria-current="
          route.name === tab.name || (tab.name === 'territory.poas.index' && isPoa)
            ? 'page'
            : undefined
        "
        class="kt-tab-toggle shrink-0 py-3.5 text-sm aria-[current=page]:border-primary aria-[current=page]:text-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring"
        >{{ tab.label }}</RouterLink
      >
    </nav>
    <MunicipalFeedback :error="error" retry @retry="reload" />
    <p v-if="!id" role="alert">La referencia municipal no es válida.</p>
    <p v-if="!permitted && !isPoa" role="alert">
      No tienes permiso para consultar la ficha del municipio.
    </p>
    <p v-if="loading" role="status">Consultando la ficha municipal…</p>
    <p v-if="blocked" role="alert" class="rounded-lg border border-border p-3 text-sm">
      {{ blocked }}
    </p>
    <p
      v-if="!loading && !error && !municipality?.active && isPoa"
      role="status"
      class="text-sm text-muted-foreground"
    >
      Solo consulta y descarga. No se ha confirmado un municipio activo.
    </p>
    <RouterView v-if="id && canRender" v-slot="{ Component }"
      ><component
        :is="Component"
        :key="route.path"
        v-bind="context"
        @busy="busy = $event"
        @dirty="dirty = $event"
    /></RouterView>
  </div>
</template>
