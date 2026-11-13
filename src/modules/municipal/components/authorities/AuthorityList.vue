<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { MunicipalAuthority, MunicipalAuthorityRole } from '../../types/authority.types'
import { useAuthorities } from '../../composables/useAuthorities'
import { municipalDate } from '../../utils/municipal.format'
import TerritoryPagination from '@/modules/territory/components/TerritoryPagination.vue'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import AuthorityIconButton from './AuthorityIconButton.vue'
import AuthorityStateSwitch from './AuthorityStateSwitch.vue'
const props = defineProps<{
  municipalityId: number
  termId?: number
  excludeCurrent?: boolean
  title?: string
  role: MunicipalAuthorityRole
  revision: number
  writable: boolean
  disabled?: boolean
  scope?: 'current' | 'all' | 'history'
  embedded?: boolean
  searchPreset?: { name: string }
}>()
const emit = defineEmits<{
  edit: [authority: MunicipalAuthority]
  changed: [authority: MunicipalAuthority]
  currentChanged: []
  busy: [value: boolean]
}>()
const auth = useAuthStore()
const council = computed(() => props.role === 'council_member')
const scope = computed(() => props.scope ?? 'all')
const heading = computed(
  () =>
    props.title ??
    (council.value
      ? scope.value === 'history'
        ? 'Concejales no vigentes'
        : 'Concejales municipales'
      : scope.value === 'history'
        ? 'Alcaldes no vigentes'
        : 'Alcaldes registrados'),
)
const canUpdate = computed(
  () =>
    props.writable &&
    (auth.hasPermission('municipal.authorities.update') ||
      (!council.value && auth.hasPermission('municipal.authorities.photos.update'))),
)
const canPublish = computed(
  () => props.writable && auth.hasPermission('municipal.authorities.publish'),
)
const search = ref('')
const query = ref('')
const current = ref('')
const published = ref('')
const page = ref(1)
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    query.value = value.trim()
  }, 300)
})
watch(
  () => props.searchPreset,
  (preset) => {
    if (!preset) return
    current.value = ''
    published.value = ''
    search.value = preset.name
    query.value = preset.name
    page.value = 1
    clearTimeout(timer)
  },
  { immediate: true, flush: 'sync' },
)
onScopeDispose(() => clearTimeout(timer))
watch(
  [current, published, () => props.revision],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
const filters = computed(() => ({
  role: props.role,
  municipal_term_id: props.termId,
  page: page.value,
  per_page: scope.value === 'current' ? 5 : 10,
  search: query.value,
  is_current: props.excludeCurrent
    ? false
    : scope.value === 'current'
      ? true
      : scope.value === 'history'
        ? false
        : current.value === ''
          ? undefined
          : current.value === 'yes',
  is_published: published.value === '' ? undefined : published.value === 'yes',
}))
const { data, loading, error, reload } = useAuthorities(
  () => props.municipalityId,
  () => filters.value,
  () => props.revision,
)
function currentChanged(authority: MunicipalAuthority) {
  emit('changed', authority)
  emit('currentChanged')
}
function publicationSaved(authority: MunicipalAuthority): void {
  if (data.value)
    data.value = {
      ...data.value,
      data: data.value.data.map((item) => (item.id === authority.id ? authority : item)),
    }
  emit('changed', authority)
  if (published.value !== '' && authority.is_published !== (published.value === 'yes'))
    void reload()
}
</script>
<template>
  <section :class="embedded ? 'min-w-0' : 'kt-card min-w-0 overflow-hidden'" :aria-label="heading">
    <header
      class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6"
    >
      <h3 class="text-base font-semibold">{{ heading }}</h3>
      <span v-if="data" class="text-xs text-muted-foreground"
        >{{ data.meta.total }} {{ data.meta.total === 1 ? 'registro' : 'registros' }}</span
      >
    </header>
    <div
      class="grid gap-3 border-b border-border p-5 sm:px-6"
      :class="scope === 'current' ? '' : 'sm:grid-cols-[minmax(0,1fr)_12rem]'"
    >
      <label class="flex flex-col gap-2 text-xs font-medium"
        >{{ council ? 'Buscar concejal' : 'Buscar alcalde'
        }}<input
          v-model="search"
          type="search"
          maxlength="150"
          placeholder="Nombre completo"
          class="kt-input w-full text-foreground"
      /></label>
      <label v-if="scope !== 'current'" class="flex flex-col gap-2 text-xs font-medium"
        >Publicación<select v-model="published" class="kt-select w-full text-foreground">
          <option value="">Todos los estados</option>
          <option value="yes">Publicados</option>
          <option value="no">No publicados</option>
        </select></label
      >
      <label
        v-if="scope === 'all' && !excludeCurrent"
        class="flex flex-col gap-2 text-xs font-medium"
        >Vigencia<select v-model="current" class="kt-select w-full text-foreground">
          <option value="">Todos los registros</option>
          <option value="yes">Vigentes</option>
          <option value="no">No vigentes</option>
        </select></label
      >
    </div>
    <MunicipalFeedback :error="error" retry class="m-5" @retry="reload" />
    <div :aria-busy="loading">
      <p v-if="loading" role="status" class="p-6 text-sm text-muted-foreground">
        Cargando autoridades…
      </p>
      <template v-else-if="data && !error">
        <div v-if="!data.data.length" class="p-6 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            {{
              search || published
                ? 'No hay coincidencias'
                : scope === 'current'
                  ? 'No hay concejales vigentes registrados'
                  : 'No hay autoridades para esta consulta'
            }}
          </p>
          <p class="mt-2 leading-relaxed">
            {{
              scope === 'current'
                ? 'Los demás registros están disponibles en el historial, donde puedes editar su vigencia.'
                : 'Puedes registrar una autoridad o ajustar los filtros de la gestión.'
            }}
          </p>
        </div>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="authority in data.data"
            :key="authority.id"
            class="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3.5 sm:px-6"
            :aria-label="(council ? 'Concejal: ' : 'Alcalde: ') + authority.full_name"
            data-authority-row
          >
            <div class="min-w-0 flex-1 basis-40">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="break-words text-sm font-medium">{{ authority.full_name }}</h4>
                <span
                  class="kt-badge kt-badge-outline"
                  :class="authority.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
                  >{{ authority.is_current ? 'Vigente' : 'No vigente' }}</span
                >
              </div>
              <p
                v-if="!council"
                class="mt-1 break-words text-xs leading-relaxed text-muted-foreground"
              >
                {{ authority.position_title || 'Alcalde o alcaldesa municipal' }} ·
                {{ municipalDate(authority.term_start) }} — {{ municipalDate(authority.term_end) }}
              </p>
              <p v-if="!canPublish" class="mt-1 text-xs text-muted-foreground">
                {{ authority.is_published ? 'Publicado' : 'No publicado' }}
              </p>
            </div>
            <div v-if="canUpdate || canPublish" class="flex flex-wrap items-center gap-3">
              <AuthorityIconButton
                v-if="canUpdate"
                :label="(council ? 'Editar nombre de ' : 'Editar ') + authority.full_name"
                icon="ki-pencil"
                :disabled="disabled"
                @click="emit('edit', authority)"
              />
              <AuthorityStateSwitch
                v-if="council && writable && auth.hasPermission('municipal.authorities.update')"
                council-current
                :municipality-id="municipalityId"
                :authority="authority"
                :writable="writable"
                :disabled="disabled"
                @busy="emit('busy', $event)"
                @changed="currentChanged"
              />
              <AuthorityStateSwitch
                v-if="canPublish"
                :municipality-id="municipalityId"
                :authority="authority"
                :writable="writable"
                :disabled="disabled"
                @busy="emit('busy', $event)"
                @changed="publicationSaved"
              />
            </div>
          </li>
        </ul>
        <TerritoryPagination
          :meta="data.meta"
          :loading="loading"
          class="border-t border-border px-5 py-4 text-xs sm:px-6"
          :label="'Paginación de ' + heading.toLowerCase()"
          @page="page = $event"
        />
      </template>
    </div>
    <slot />
  </section>
</template>
