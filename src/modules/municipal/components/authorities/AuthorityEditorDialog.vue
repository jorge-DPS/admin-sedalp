<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { MunicipalAuthority, MunicipalAuthorityRole } from '../../types/authority.types'
import type { MunicipalTerm } from '../../types/term.types'
import { authoritiesApi } from '../../api/authorities.api'
import { useMunicipalQuery } from '../../composables/useMunicipalQuery'
import MunicipalFormDialog from '../MunicipalFormDialog.vue'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import AuthorityForm from './AuthorityForm.vue'

const props = defineProps<{
  municipalityId: number
  term: MunicipalTerm
  terms: MunicipalTerm[]
  role: MunicipalAuthorityRole
  authorityId?: number
  currentMayor: MunicipalAuthority | null
  currentKnown: boolean
  writable: boolean
  active: boolean
}>()
const emit = defineEmits<{
  close: []
  saved: [authority: MunicipalAuthority]
  persisted: [authority: MunicipalAuthority]
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const editor = ref<InstanceType<typeof MunicipalFormDialog>>()
const busy = ref(false)
const dirty = ref(false)
const draft = shallowRef<MunicipalAuthority>()
const { data, loading, error, reload } = useMunicipalQuery(
  'municipal.authorities.view',
  () => props.authorityId,
  async (signal) => {
    if (props.authorityId === undefined) return null
    const authority = await authoritiesApi.show(props.municipalityId, props.authorityId, signal)
    if (authority.municipality_id !== props.municipalityId || authority.role !== props.role)
      throw new Error('La autoridad no corresponde al municipio o cargo seleccionado.')
    return authority
  },
)
const authority = computed(() => draft.value ?? data.value ?? undefined)
const title = computed(
  () =>
    (props.authorityId === undefined ? 'Registrar ' : 'Editar ') +
    (props.role === 'mayor' ? 'alcalde o alcaldesa' : 'concejal'),
)
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
onBeforeUnmount(() => {
  emit('busy', false)
  emit('dirty', false)
})
function persisted(value: MunicipalAuthority) {
  draft.value = value
  emit('persisted', value)
}
</script>

<template>
  <MunicipalFormDialog
    ref="editor"
    :title="title"
    :description="term.label"
    :wide="role === 'mayor'"
    :busy="busy"
    :dirty="dirty"
    @close="emit('close')"
  >
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">Cargando autoridad…</p>
    <MunicipalFeedback :error="error" retry @retry="reload" />
    <AuthorityForm
      v-if="authority || authorityId === undefined"
      :municipality-id="municipalityId"
      :term-id="term.id"
      :terms="terms"
      :role="role"
      :authority="authority"
      :current-mayor="currentMayor"
      :current-known="currentKnown"
      :writable="writable"
      :active="active"
      @busy="busy = $event"
      @dirty="dirty = $event"
      @cancel="editor?.requestClose()"
      @persisted="persisted"
      @saved="emit('saved', $event)"
    />
  </MunicipalFormDialog>
</template>
