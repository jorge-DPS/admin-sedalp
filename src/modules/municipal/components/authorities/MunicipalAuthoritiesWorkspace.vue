<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Municipality } from '@/modules/territory/types/territory.types'
import type { PaginationMeta } from '@/shared/api/types'
import type { MunicipalAuthority } from '../../types/authority.types'
import type { MunicipalTerm } from '../../types/term.types'
import { authoritiesApi } from '../../api/authorities.api'
import { useCurrentMayor } from '../../composables/useAuthorities'
import { useMunicipalQuery } from '../../composables/useMunicipalQuery'
import { useMunicipalTerms } from '../../composables/useMunicipalTerms'
import { positiveId } from '../../utils/municipal.format'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import MunicipalPageHeader from '../MunicipalPageHeader.vue'
import MunicipalSidePanel from '../MunicipalSidePanel.vue'
import MunicipalTermForm from './MunicipalTermForm.vue'
import MayorSection from './MayorSection.vue'
import AuthorityList from './AuthorityList.vue'
import AuthorityIconButton from './AuthorityIconButton.vue'
import AuthorityRegistrationPanel from './AuthorityRegistrationPanel.vue'
const props = defineProps<{ municipalityId: number; municipality: Municipality; active: boolean }>()
const emit = defineEmits<{ busy: [boolean]; dirty: [boolean] }>()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const terms = useMunicipalTerms(() => props.municipalityId)
const selectedId = ref(positiveId(route.query.gestion))
const selectedTerm = computed(
  () => terms.data.value?.find((term) => term.id === selectedId.value) ?? null,
)
const revision = ref(0)
const currentRevision = ref(0)
const termPanel = ref<'create' | 'edit' | null>(null)
const termBusy = ref(false)
const termDirty = ref(false)
const mayorBusy = ref(false)
const councilBusy = ref(false)
const publicationBusy = ref(false)
const mayorDirty = ref(false)
const councilDirty = ref(false)
const busy = computed(
  () => termBusy.value || mayorBusy.value || councilBusy.value || publicationBusy.value,
)
const dirty = computed(() => termDirty.value || mayorDirty.value || councilDirty.value)
const mayorEditor = ref<InstanceType<typeof AuthorityRegistrationPanel>>()
const councilEditor = ref<InstanceType<typeof AuthorityRegistrationPanel>>()
const termEditor = ref<InstanceType<typeof MunicipalSidePanel>>()
const notice = ref('')
const mayorSearch = ref<{ name: string }>()
const councilSearch = ref<{ name: string }>()
const writable = computed(
  () =>
    props.municipality.id === props.municipalityId &&
    props.municipality.active &&
    auth.hasPermission('municipal.authorities.view'),
)
const canCreate = computed(
  () => writable.value && auth.hasPermission('municipal.authorities.create'),
)
const canUpdate = computed(
  () => writable.value && auth.hasPermission('municipal.authorities.update'),
)
const canEditMayor = computed(
  () =>
    writable.value &&
    (canUpdate.value || auth.hasPermission('municipal.authorities.photos.update')),
)
const current = useCurrentMayor(
  () => props.municipalityId,
  () => currentRevision.value,
)
const currentKnown = computed(
  () => current.permitted.value && !current.loading.value && !current.error.value,
)
const selectedMayor = computed(() =>
  current.data.value?.municipal_term_id === selectedId.value ? current.data.value : null,
)
watch(terms.data, (rows) => {
  if (selectedId.value === null && rows?.length) selectedId.value = rows[0]!.id
})
watch(
  () => route.query.gestion,
  (value) => {
    selectedId.value = positiveId(value) ?? terms.data.value?.[0]?.id ?? null
  },
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
function selectTerm(event: Event) {
  const input = event.target as HTMLSelectElement
  if (busy.value || dirty.value) {
    input.value = String(selectedId.value ?? '')
    return
  }
  mayorSearch.value = undefined
  councilSearch.value = undefined
  selectedId.value = positiveId(input.value)
  void router.replace({
    query: {
      ...route.query,
      gestion: selectedId.value === null ? undefined : String(selectedId.value),
    },
  })
}
function closeTerm() {
  termPanel.value = null
  termDirty.value = false
  termBusy.value = false
}
function termSaved(term: MunicipalTerm) {
  terms.data.value = [...(terms.data.value ?? []).filter((item) => item.id !== term.id), term].sort(
    (a, b) => b.start_year - a.start_year || a.id - b.id,
  )
  mayorSearch.value = undefined
  councilSearch.value = undefined
  selectedId.value = term.id
  closeTerm()
  notice.value = term.label + ' guardada.'
  void router.replace({ query: { ...route.query, gestion: String(term.id) } })
}
function persisted(authority: MunicipalAuthority) {
  if (authority.is_current && authority.role === 'mayor') current.data.value = authority
  else if (current.data.value?.id === authority.id) current.data.value = null
  revision.value += 1
}
function saved(authority: MunicipalAuthority) {
  persisted(authority)
  if (authority.role === 'council_member') councilSearch.value = { name: authority.full_name }
  else if (!authority.is_current) mayorSearch.value = { name: authority.full_name }
  if (authority.municipal_term_id) selectedId.value = authority.municipal_term_id
  notice.value = 'Registro de ' + authority.full_name + ' guardado en su gestión municipal.'
  void terms.reload()
}
async function editAuthority(authority: MunicipalAuthority) {
  if (busy.value || !selectedTerm.value) return
  if (authority.role === 'mayor' ? !canEditMayor.value : !canUpdate.value) return
  await nextTick()
  await (authority.role === 'mayor' ? mayorEditor.value : councilEditor.value)?.edit(authority)
}
function publicationChanged(authority: MunicipalAuthority) {
  if (current.data.value?.id === authority.id) current.data.value = authority
}
function refresh() {
  if (busy.value || dirty.value) return
  currentRevision.value += 1
  revision.value += 1
  void terms.reload()
}
const legacyOpen = ref(false)
const legacySearch = ref('')
const legacyPage = ref(1)
watch(legacySearch, () => {
  legacyPage.value = 1
})
const legacy = useMunicipalQuery(
  'municipal.authorities.view',
  () => [props.municipalityId, legacyOpen.value, revision.value],
  (signal) => {
    if (!legacyOpen.value) return null
    return (async () => {
      const items: MunicipalAuthority[] = []
      let page = 1,
        last = 1
      do {
        const result = await authoritiesApi.index(
          props.municipalityId,
          { page, per_page: 100 },
          signal,
        )
        signal.throwIfAborted()
        items.push(...result.data.filter((item) => item.municipal_term_id === null))
        last = result.meta.last_page
        page += 1
      } while (page <= last)
      return items
    })()
  },
)
const legacyFiltered = computed(() =>
  (legacy.data.value ?? []).filter((item) =>
    item.full_name.toLocaleLowerCase().includes(legacySearch.value.toLocaleLowerCase()),
  ),
)
const legacyMeta = computed<PaginationMeta>(() => ({
  current_page: legacyPage.value,
  per_page: 10,
  last_page: Math.max(1, Math.ceil(legacyFiltered.value.length / 10)),
  total: legacyFiltered.value.length,
  from: legacyFiltered.value.length ? (legacyPage.value - 1) * 10 + 1 : null,
  to: legacyFiltered.value.length
    ? Math.min(legacyPage.value * 10, legacyFiltered.value.length)
    : null,
  links: [],
  path: '',
}))
watch(legacyFiltered, () => {
  legacyPage.value = Math.min(legacyPage.value, legacyMeta.value.last_page)
})
</script>
<template>
  <div class="flex min-w-0 flex-col gap-5">
    <MunicipalPageHeader
      title="Autoridades por gestión"
      description="Consulta y administra los alcaldes y concejales de cada período municipal."
      ><template #actions
        ><button
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
          :disabled="busy || dirty || terms.loading.value"
          @click="refresh"
        >
          <i class="ki-filled ki-arrows-circle" aria-hidden="true" />Actualizar
        </button></template
      ></MunicipalPageHeader
    >
    <p
      v-if="!writable"
      role="status"
      class="rounded-lg border border-border p-4 text-sm text-muted-foreground"
    >
      Municipio inactivo: solo consulta de autoridades y gestiones.
    </p>
    <p
      v-if="notice"
      role="status"
      class="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm"
    >
      {{ notice }}
    </p>
    <MunicipalFeedback :error="terms.error.value" retry @retry="terms.reload" />
    <div
      class="kt-card min-w-0 flex-col items-stretch gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-6"
    >
      <label class="flex w-full min-w-0 flex-col gap-2 text-sm font-medium sm:max-w-sm sm:flex-1"
        >Gestión municipal<select
          :value="selectedId ?? ''"
          class="kt-select w-full text-foreground"
          :disabled="busy || dirty || terms.loading.value || !terms.data.value?.length"
          @change="selectTerm"
        >
          <option value="" disabled>
            {{ terms.loading.value ? 'Cargando gestiones…' : 'Selecciona una gestión' }}
          </option>
          <option v-for="term in terms.data.value" :key="term.id" :value="term.id">
            {{ term.label }}
          </option>
        </select></label
      >
      <div class="flex flex-wrap gap-2">
        <button
          v-if="canCreate"
          type="button"
          class="kt-btn kt-btn-primary"
          :disabled="busy || dirty"
          @click="termPanel = 'create'"
        >
          <i class="ki-filled ki-plus" aria-hidden="true" />Nueva gestión</button
        ><button
          v-if="canUpdate && selectedTerm"
          type="button"
          class="kt-btn kt-btn-outline text-foreground"
          :disabled="busy || dirty"
          @click="termPanel = 'edit'"
        >
          <i class="ki-filled ki-pencil" aria-hidden="true" />{{
            selectedTerm.authorities_count ? 'Ver período' : 'Editar período'
          }}
        </button>
      </div>
    </div>
    <p
      v-if="terms.loading.value && !terms.data.value"
      role="status"
      class="text-sm text-muted-foreground"
    >
      Consultando gestiones municipales…
    </p>
    <p
      v-else-if="!terms.error.value && !terms.data.value?.length"
      class="rounded-lg border border-border p-6 text-sm text-muted-foreground"
    >
      Todavía no hay gestiones.
      {{
        canCreate
          ? 'Crea una gestión para agrupar a los alcaldes y concejales.'
          : 'Un usuario autorizado debe registrar la primera gestión.'
      }}
    </p>
    <p
      v-else-if="!selectedTerm && !terms.error.value"
      role="alert"
      class="text-sm text-destructive"
    >
      La gestión seleccionada no pertenece a este municipio. Selecciona otra gestión.
    </p>
    <template v-if="selectedTerm">
      <p class="text-sm text-muted-foreground">
        {{ selectedTerm.label }} agrupa sus autoridades vigentes, anteriores y pendientes de asumir.
      </p>
      <MunicipalFeedback :error="current.error.value" retry @retry="current.reload" />
      <div
        class="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        data-term-authorities
      >
        <section class="kt-card min-w-0 overflow-hidden" aria-label="Alcaldes de la gestión">
          <header class="border-b border-border px-5 py-4 sm:px-6">
            <h3 class="text-base font-semibold">Alcaldes de la gestión</h3>
          </header>
          <MayorSection
            v-if="selectedMayor"
            embedded
            :municipality-id="municipalityId"
            :authority="selectedMayor"
            :writable="writable"
            :active="active"
            :disabled="busy"
            @edit="editAuthority"
            @busy="publicationBusy = $event"
            @publication-changed="publicationChanged"
          />
          <p
            v-else-if="current.loading.value"
            role="status"
            class="p-5 text-sm text-muted-foreground"
          >
            Comprobando el alcalde vigente del municipio…
          </p>
          <AuthorityList
            :key="'mayors-' + selectedTerm.id"
            embedded
            :title="selectedMayor ? 'Otros alcaldes de esta gestión' : 'Alcaldes registrados'"
            :municipality-id="municipalityId"
            :term-id="selectedTerm.id"
            role="mayor"
            scope="all"
            :exclude-current="!!selectedMayor"
            :search-preset="mayorSearch"
            :revision="revision"
            :writable="writable"
            :disabled="busy"
            @edit="editAuthority"
            @busy="publicationBusy = $event"
            @changed="publicationChanged"
          />
          <AuthorityRegistrationPanel
            v-if="canCreate || canEditMayor"
            :key="'mayor-editor-' + selectedTerm.id"
            ref="mayorEditor"
            embedded
            :municipality-id="municipalityId"
            :term-id="selectedTerm.id"
            :terms="terms.data.value ?? []"
            role="mayor"
            :current-mayor="current.data.value"
            :current-known="currentKnown"
            :writable="writable"
            :disabled="busy"
            :active="active"
            :can-create="canCreate"
            @busy="mayorBusy = $event"
            @dirty="mayorDirty = $event"
            @persisted="persisted"
            @saved="saved"
          />
        </section>
        <AuthorityList
          :key="'council-' + selectedTerm.id"
          title="Concejales de la gestión"
          :search-preset="councilSearch"
          :municipality-id="municipalityId"
          :term-id="selectedTerm.id"
          role="council_member"
          scope="all"
          :revision="revision"
          :writable="writable"
          :disabled="busy"
          @edit="editAuthority"
          @busy="publicationBusy = $event"
          @current-changed="revision++"
        >
          <AuthorityRegistrationPanel
            v-if="canCreate || canUpdate"
            :key="'council-editor-' + selectedTerm.id"
            ref="councilEditor"
            embedded
            :municipality-id="municipalityId"
            :term-id="selectedTerm.id"
            :terms="terms.data.value ?? []"
            role="council_member"
            :current-mayor="current.data.value"
            :current-known="currentKnown"
            :writable="writable"
            :disabled="busy"
            :active="active"
            :can-create="canCreate"
            @busy="councilBusy = $event"
            @dirty="councilDirty = $event"
            @persisted="persisted"
            @saved="saved"
          />
        </AuthorityList>
      </div>
    </template>
    <details
      class="min-w-0 rounded-lg border border-border bg-card"
      @toggle="legacyOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary
        class="cursor-pointer rounded-lg p-5 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        Registros sin gestión
      </summary>
      <div v-if="legacyOpen" class="flex min-w-0 flex-col gap-4 border-t border-border p-5">
        <p class="text-sm leading-relaxed text-muted-foreground">
          Los registros anteriores se conservan sin asignación automática. Edítalos y selecciona su
          gestión cuando tengas la información confirmada.
        </p>
        <label class="flex flex-col gap-2 text-sm"
          >Buscar registro histórico<input
            v-model="legacySearch"
            class="kt-input w-full text-foreground"
            type="search"
            maxlength="150" /></label
        ><MunicipalFeedback :error="legacy.error.value" retry @retry="legacy.reload" />
        <p v-if="legacy.loading.value" role="status" class="text-sm text-muted-foreground">
          Buscando registros sin gestión…
        </p>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="authority in legacyFiltered.slice((legacyPage - 1) * 10, legacyPage * 10)"
            :key="authority.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="break-words text-sm font-medium">{{ authority.full_name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ authority.role === 'mayor' ? 'Alcaldía' : 'Concejo municipal' }} · Sin gestión
                asignada
              </p>
            </div>
            <AuthorityIconButton
              v-if="selectedTerm && (authority.role === 'mayor' ? canEditMayor : canUpdate)"
              :label="'Asignar gestión a ' + authority.full_name"
              icon="ki-pencil"
              :disabled="busy"
              @click="editAuthority(authority)"
            />
          </li>
        </ul>
        <p
          v-if="!legacy.loading.value && !legacy.error.value && !legacyFiltered.length"
          class="text-sm text-muted-foreground"
        >
          No hay registros sin gestión para esta consulta.
        </p>
        <TerritoryPagination
          v-if="!legacy.error.value"
          :meta="legacyMeta"
          :loading="legacy.loading.value"
          label="Paginación de registros sin gestión"
          @page="legacyPage = $event"
        />
      </div>
    </details>
    <MunicipalSidePanel
      v-if="termPanel"
      ref="termEditor"
      :title="termPanel === 'create' ? 'Nueva gestión municipal' : 'Período de la gestión'"
      :description="municipality.name"
      :busy="termBusy"
      :dirty="termDirty"
      @close="closeTerm"
      ><MunicipalTermForm
        :municipality-id="municipalityId"
        :term="termPanel === 'edit' ? (selectedTerm ?? undefined) : undefined"
        :writable="writable && (termPanel === 'create' ? canCreate : canUpdate)"
        @busy="termBusy = $event"
        @dirty="termDirty = $event"
        @close="termEditor?.requestClose()"
        @saved="termSaved"
    /></MunicipalSidePanel>
  </div>
</template>
