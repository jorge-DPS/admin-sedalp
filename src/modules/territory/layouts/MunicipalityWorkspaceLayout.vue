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
    icon: 'ki-element-11',
    permission: 'municipalities.view',
  },
  {
    name: 'territory.poas.index',
    label: 'POA municipales',
    icon: 'ki-notepad',
    permission: 'municipal.poas.view',
  },
  {
    name: 'territory.authorities',
    label: 'Autoridades',
    icon: 'ki-people',
    permission: 'municipal.authorities.view',
  },
]
const visibleTabs = computed(() => tabs.filter((tab) => auth.hasPermission(tab.permission)))
const busy = ref(false)
const dirty = ref(false)
const blocked = ref('')
const isPoa = computed(() => String(route.name).startsWith('territory.poas.'))
const canRender = computed(() => !!municipality.value || (!permitted.value && isPoa.value))
const context = computed(() =>
  route.name === 'territory.municipalities.overview'
    ? { municipality: municipality.value, onMunicipalityUpdated: updateMunicipality }
    : {
        municipalityId: id.value,
        municipality: municipality.value,
        ...(route.name === 'territory.authorities' ? { active: true } : {}),
      },
)
function updateMunicipality(value: NonNullable<typeof municipality.value>) {
  if (value.id === id.value) municipality.value = value
}
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
  <div class="kt-container-fixed pb-10">
    <div class="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4 sm:gap-5">
      <header class="min-w-0">
        <nav
          aria-label="Ruta de navegación"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
        >
          <span>Territorio</span><span aria-hidden="true">/</span>
          <RouterLink
            v-if="permitted"
            :to="{ name: 'territory.municipalities.index', query: route.query }"
            class="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >Municipios</RouterLink
          ><span v-else>Municipios</span> <span aria-hidden="true">/</span
          ><span class="min-w-0 break-words">{{ municipality?.name ?? 'Municipio' }}</span>
          <span aria-hidden="true">/</span
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
          ><span aria-current="page" class="font-medium text-foreground">{{
            route.meta.title
          }}</span>
        </nav>
        <div class="flex min-w-0 items-center gap-3 py-3.5 sm:gap-3.5 sm:py-4">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-10"
            aria-hidden="true"
          >
            <i class="ki-filled ki-geolocation text-lg" />
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1
                class="min-w-0 break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
              >
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
            <p
              v-if="municipality && route.name !== 'territory.municipalities.overview'"
              class="mt-1 break-words text-xs text-muted-foreground"
            >
              {{
                [municipality.province?.name, municipality.region?.name]
                  .filter(Boolean)
                  .join(' · ') || 'Ubicación territorial sin informar'
              }}
            </p>
          </div>
        </div>
        <nav
          aria-label="Administración municipal"
          class="kt-tabs kt-tabs-line w-full gap-1 border-b border-border sm:gap-4"
        >
          <RouterLink
            v-for="tab in visibleTabs"
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
            class="kt-tab-toggle min-w-0 flex-1 justify-center gap-2 px-1 py-2.5 text-center text-xs aria-[current=page]:border-primary aria-[current=page]:text-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring sm:flex-none sm:px-2.5 sm:text-sm"
            ><i :class="['ki-filled hidden sm:inline-block', tab.icon]" aria-hidden="true" />
            {{ tab.label }}</RouterLink
          >
        </nav>
      </header>
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
  </div>
</template>
