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
const canSetCurrent = computed(
  () => council.value && props.writable && auth.hasPermission('municipal.authorities.update'),
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
  updateRow(authority)
  if (filters.value.is_current !== undefined && authority.is_current !== filters.value.is_current)
    void reload()
}
function updateRow(authority: MunicipalAuthority): void {
  if (data.value)
    data.value = {
      ...data.value,
      data: data.value.data.map((item) => (item.id === authority.id ? authority : item)),
    }
  emit('changed', authority)
}
function publicationSaved(authority: MunicipalAuthority): void {
  updateRow(authority)
  if (published.value !== '' && authority.is_published !== (published.value === 'yes'))
    void reload()
}
</script>
<template>
  <section
    :class="
      embedded ? 'min-w-0 border-t border-border' : 'kt-card min-w-0 overflow-hidden rounded-xl'
    "
    :aria-label="heading"
  >
    <header
      v-if="!embedded"
      class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5"
    >
      <h3 class="text-sm font-semibold">{{ heading }}</h3>
      <div class="flex flex-wrap items-center gap-3">
        <span v-if="data" class="text-xs text-muted-foreground">
          {{ data.meta.total }} {{ data.meta.total === 1 ? 'registro' : 'registros' }}
        </span>
        <slot name="actions" />
      </div>
    </header>
    <div
      class="grid gap-2.5 border-b border-border bg-muted/20 px-3.5 py-2.5"
      :class="
        scope === 'all' && !excludeCurrent
          ? 'sm:grid-cols-3'
          : scope !== 'current'
            ? 'sm:grid-cols-2'
            : undefined
      "
    >
      <label class="flex min-w-0 flex-col gap-1 text-xs font-medium"
        >{{ council ? 'Buscar concejal' : 'Buscar alcalde'
        }}<input
          v-model="search"
          :disabled="disabled"
          name="authority-search"
          type="search"
          maxlength="150"
          placeholder="Nombre completo"
          class="kt-input kt-input-sm w-full text-foreground"
      /></label>
      <label v-if="scope !== 'current'" class="flex min-w-0 flex-col gap-1 text-xs font-medium"
        >Publicación<select
          v-model="published"
          name="authority-publication"
          :disabled="disabled"
          class="kt-select kt-select-sm w-full text-foreground"
        >
          <option value="">Todos los estados</option>
          <option value="yes">Publicados</option>
          <option value="no">No publicados</option>
        </select></label
      >
      <label
        v-if="scope === 'all' && !excludeCurrent"
        class="flex min-w-0 flex-col gap-1 text-xs font-medium"
        >Vigencia<select
          v-model="current"
          name="authority-current"
          :disabled="disabled"
          class="kt-select kt-select-sm w-full text-foreground"
        >
          <option value="">Todos los registros</option>
          <option value="yes">Vigentes</option>
          <option value="no">No vigentes</option>
        </select></label
      >
    </div>
    <MunicipalFeedback :error="error" retry class="m-5" @retry="reload" />
    <div :aria-busy="loading">
      <p v-if="loading" role="status" class="px-3.5 py-4 text-sm text-muted-foreground">
        Cargando autoridades…
      </p>
      <template v-else-if="data && !error">
        <div v-if="!data.data.length" class="px-3.5 py-4 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            {{
              search || published || current
                ? 'No hay coincidencias'
                : scope === 'current'
                  ? 'No hay concejales vigentes registrados'
                  : 'No hay autoridades para esta consulta'
            }}
          </p>
        </div>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="authority in data.data"
            :key="authority.id"
            class="flex min-w-0 flex-col justify-between gap-x-3 gap-y-1.5 px-3.5 py-2.5 sm:flex-row sm:items-center"
            :aria-label="(council ? 'Concejal: ' : 'Alcalde: ') + authority.full_name"
            data-authority-row
          >
            <div class="min-w-0 sm:flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="break-words text-sm font-medium">{{ authority.full_name }}</h4>
                <span
                  v-if="!council"
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
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <AuthorityStateSwitch
                v-if="canSetCurrent"
                council-current
                :municipality-id="municipalityId"
                :authority="authority"
                :writable="writable"
                :disabled="disabled"
                @busy="emit('busy', $event)"
                @changed="currentChanged"
              />
              <span v-else-if="council" class="text-xs text-muted-foreground">
                {{ authority.is_current ? 'Vigente' : 'No vigente' }}
              </span>
              <AuthorityStateSwitch
                v-if="canPublish"
                :municipality-id="municipalityId"
                :authority="authority"
                :writable="writable"
                :disabled="disabled"
                @busy="emit('busy', $event)"
                @changed="publicationSaved"
              />
              <span v-else class="text-xs text-muted-foreground">
                {{ authority.is_published ? 'Publicado' : 'No publicado' }}
              </span>
              <AuthorityIconButton
                v-if="canUpdate"
                :label="(council ? 'Editar nombre de ' : 'Editar ') + authority.full_name"
                icon="ki-pencil"
                :disabled="disabled"
                @click="emit('edit', authority)"
              />
            </div>
          </li>
        </ul>
        <TerritoryPagination
          :meta="data.meta"
          :loading="loading || disabled"
          class="border-t border-border px-3.5 py-2.5 text-xs"
          :label="'Paginación de ' + heading.toLowerCase()"
          @page="page = $event"
        />
      </template>
    </div>
  </section>
</template>
