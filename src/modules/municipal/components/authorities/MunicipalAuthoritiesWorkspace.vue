<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Municipality } from '@/modules/territory/types/territory.types'
import type { PaginationMeta } from '@/shared/api/types'
import type { MunicipalAuthority, MunicipalAuthorityRole } from '../../types/authority.types'
import type { MunicipalTerm } from '../../types/term.types'
import { authoritiesApi } from '../../api/authorities.api'
import { useCurrentMayor } from '../../composables/useAuthorities'
import { useMunicipalQuery } from '../../composables/useMunicipalQuery'
import { useMunicipalTerms } from '../../composables/useMunicipalTerms'
import { positiveId } from '../../utils/municipal.format'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import MunicipalPageHeader from '../MunicipalPageHeader.vue'
import MunicipalFormDialog from '../MunicipalFormDialog.vue'
import MunicipalTermForm from './MunicipalTermForm.vue'
import MayorSection from './MayorSection.vue'
import AuthorityList from './AuthorityList.vue'
import AuthorityIconButton from './AuthorityIconButton.vue'
import AuthorityEditorDialog from './AuthorityEditorDialog.vue'
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
const authorityBusy = ref(false)
const publicationBusy = ref(false)
const authorityDirty = ref(false)
const busy = computed(() => termBusy.value || authorityBusy.value || publicationBusy.value)
const dirty = computed(() => termDirty.value || authorityDirty.value)
const authorityEditor = shallowRef<{ role: MunicipalAuthorityRole; id?: number }>()
const termEditor = ref<InstanceType<typeof MunicipalFormDialog>>()
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
  authorityEditor.value = undefined
  authorityDirty.value = false
  persisted(authority)
  if (authority.role === 'council_member') councilSearch.value = { name: authority.full_name }
  else if (!authority.is_current) mayorSearch.value = { name: authority.full_name }
  if (authority.municipal_term_id) selectedId.value = authority.municipal_term_id
  notice.value = 'Registro de ' + authority.full_name + ' guardado en su gestión municipal.'
  void terms.reload()
}
function editAuthority(authority: MunicipalAuthority) {
  if (busy.value || dirty.value || !selectedTerm.value) return
  if (authority.role === 'mayor' ? !canEditMayor.value : !canUpdate.value) return
  authorityEditor.value = { role: authority.role, id: authority.id }
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
  <div class="max-w-5xl">
    <div class="flex min-w-0 flex-col gap-3.5">
      <MunicipalPageHeader title="Autoridades municipales">
        <template #actions>
          <button
            type="button"
            class="kt-btn kt-btn-sm kt-btn-ghost"
            :disabled="busy || dirty || terms.loading.value"
            @click="refresh"
          >
            <i class="ki-filled ki-arrows-circle" aria-hidden="true" />Actualizar
          </button>
        </template>
      </MunicipalPageHeader>
      <p
        v-if="!writable"
        role="status"
        class="rounded-lg border border-border bg-muted/25 px-3.5 py-2.5 text-sm text-muted-foreground"
      >
        El municipio está inactivo. Puedes consultar sus gestiones y autoridades.
      </p>
      <p
        v-if="notice"
        role="status"
        class="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm"
      >
        {{ notice }}
      </p>
      <MunicipalFeedback :error="terms.error.value" retry @retry="terms.reload" />
      <div class="flex min-w-0 flex-wrap items-end gap-2.5 border-b border-border pb-3">
        <label class="flex w-full min-w-0 flex-col gap-1 text-xs font-medium sm:w-56">
          Gestión municipal
          <select
            name="gestion"
            :value="selectedId ?? ''"
            class="kt-select kt-select-sm w-full"
            :disabled="busy || dirty || terms.loading.value || !terms.data.value?.length"
            @change="selectTerm"
          >
            <option value="" disabled>
              {{ terms.loading.value ? 'Cargando gestiones…' : 'Selecciona una gestión' }}
            </option>
            <option v-for="term in terms.data.value" :key="term.id" :value="term.id">
              {{ term.label }}
            </option>
          </select>
        </label>
        <button
          v-if="canUpdate && selectedTerm"
          type="button"
          class="kt-btn kt-btn-sm kt-btn-outline"
          :disabled="busy || dirty"
          @click="termPanel = 'edit'"
        >
          <i
            class="ki-filled"
            :class="selectedTerm.authorities_count ? 'ki-eye' : 'ki-pencil'"
            aria-hidden="true"
          />
          {{ selectedTerm.authorities_count ? 'Ver período' : 'Editar período' }}
        </button>
        <button
          v-if="canCreate"
          type="button"
          class="kt-btn kt-btn-sm kt-btn-primary sm:ms-auto"
          :disabled="busy || dirty"
          @click="termPanel = 'create'"
        >
          <i class="ki-filled ki-plus" aria-hidden="true" />Nueva gestión
        </button>
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
        class="w-fit rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
      >
        {{
          canCreate
            ? 'Crea una gestión para registrar a sus autoridades.'
            : 'Todavía no hay gestiones registradas.'
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
        <MunicipalFeedback :error="current.error.value" retry @retry="current.reload" />
        <div
          class="grid min-w-0 items-start gap-3.5 lg:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)]"
        >
          <section
            class="kt-card min-w-0 overflow-hidden rounded-xl"
            aria-labelledby="mayor-heading"
          >
            <header
              class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5"
            >
              <h3 id="mayor-heading" class="text-sm font-semibold">Alcaldía</h3>
              <button
                v-if="canCreate"
                type="button"
                class="kt-btn kt-btn-sm kt-btn-ghost"
                :disabled="busy || dirty"
                @click="authorityEditor = { role: 'mayor' }"
              >
                <i class="ki-filled ki-plus" aria-hidden="true" />Registrar alcalde
              </button>
            </header>
            <MayorSection
              v-if="selectedMayor"
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
              class="px-3.5 py-3 text-sm text-muted-foreground"
            >
              Consultando la alcaldía vigente…
            </p>
            <p v-else-if="currentKnown" class="px-3.5 py-3 text-sm text-muted-foreground">
              Esta gestión no tiene un alcalde vigente.
            </p>
          </section>
          <AuthorityList
            :key="'council-' + selectedTerm.id"
            title="Concejo Municipal"
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
          >
            <template v-if="canCreate" #actions>
              <button
                type="button"
                class="kt-btn kt-btn-sm kt-btn-outline"
                :disabled="busy || dirty"
                @click="authorityEditor = { role: 'council_member' }"
              >
                <i class="ki-filled ki-plus" aria-hidden="true" />Registrar concejal
              </button>
            </template>
          </AuthorityList>
        </div>
        <details :open="!selectedMayor" class="min-w-0 rounded-xl border border-border bg-card">
          <summary
            class="cursor-pointer rounded-xl px-3.5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
          >
            Historial de alcaldía
          </summary>
          <AuthorityList
            :key="'mayors-' + selectedTerm.id"
            :title="selectedMayor ? 'Historial de alcaldía' : 'Alcaldes registrados en la gestión'"
            embedded
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
        </details>
      </template>
      <details
        class="min-w-0 rounded-xl border border-border bg-card"
        @toggle="legacyOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary
          class="cursor-pointer rounded-xl px-3.5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
        >
          Historial sin gestión asignada
        </summary>
        <div v-if="legacyOpen" class="flex min-w-0 flex-col gap-3 border-t border-border p-3.5">
          <label class="flex w-full max-w-xs flex-col gap-1 text-xs font-medium"
            >Buscar registro histórico<input
              v-model="legacySearch"
              class="kt-input kt-input-sm w-full text-foreground"
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
    </div>
    <MunicipalFormDialog
      v-if="termPanel"
      ref="termEditor"
      :title="termPanel === 'create' ? 'Nueva gestión municipal' : 'Período de la gestión'"
      :description="municipality.name"
      :busy="termBusy"
      :dirty="termDirty"
      @close="closeTerm"
    >
      <MunicipalTermForm
        :municipality-id="municipalityId"
        :term="termPanel === 'edit' ? (selectedTerm ?? undefined) : undefined"
        :writable="writable"
        @busy="termBusy = $event"
        @dirty="termDirty = $event"
        @saved="termSaved"
        @close="termEditor?.requestClose()"
      />
    </MunicipalFormDialog>
    <AuthorityEditorDialog
      v-if="authorityEditor && selectedTerm"
      :municipality-id="municipalityId"
      :term="selectedTerm"
      :terms="terms.data.value ?? []"
      :role="authorityEditor.role"
      :authority-id="authorityEditor.id"
      :current-mayor="current.data.value"
      :current-known="currentKnown"
      :writable="writable"
      :active="active"
      @busy="authorityBusy = $event"
      @dirty="authorityDirty = $event"
      @persisted="persisted"
      @saved="saved"
      @close="authorityEditor = undefined"
    />
  </div>
</template>
