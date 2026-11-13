<script setup lang="ts">
import { computed, reactive, ref, shallowRef, useId, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAuthorityActions } from '../../composables/useAuthorityActions'
import { authorityDateErrors, municipalToday } from '../../utils/authority.validation'
import type {
  MunicipalAuthority,
  MunicipalAuthorityRole,
  AuthorityFields,
} from '../../types/authority.types'
import MunicipalFeedback from '../MunicipalFeedback.vue'
import MayorPhotoField from './MayorPhotoField.vue'
import type { MunicipalTerm } from '../../types/term.types'
const props = defineProps<{
  municipalityId: number
  termId?: number
  terms?: MunicipalTerm[]
  role: MunicipalAuthorityRole
  authority?: MunicipalAuthority
  currentMayor: MunicipalAuthority | null
  currentKnown: boolean
  writable: boolean
  active?: boolean
}>()
const emit = defineEmits<{
  saved: [authority: MunicipalAuthority]
  persisted: [authority: MunicipalAuthority]
  cancel: []
  busy: [value: boolean]
  dirty: [value: boolean]
}>()
const auth = useAuthStore()
const { error, create, update, uploadPhoto, transition, progress } = useAuthorityActions(
  props.municipalityId,
  () => props.writable,
)
const id = useId()
const record = shallowRef<MunicipalAuthority | undefined>(props.authority)
const form = reactive({
  municipal_term_id: props.authority
    ? (props.authority.municipal_term_id ?? '')
    : (props.termId ?? ''),
  full_name: props.authority?.full_name ?? '',
  position_title: props.authority?.position_title ?? '',
  term_start: props.authority?.term_start ?? '',
  term_end: props.authority?.term_end ?? '',
  source_reference: props.authority?.source_reference ?? '',
  notes: props.authority?.notes ?? '',
  is_current: props.authority?.is_current ?? false,
})
const baseline = ref(JSON.stringify(form))
const metadataDirty = computed(() => JSON.stringify(form) !== baseline.value)
const isMayor = computed(() => props.role === 'mayor')
const anotherMayor = computed(
  () => props.currentMayor !== null && props.currentMayor.id !== record.value?.id,
)
const canSetCurrent = computed(() => props.currentKnown)
const canWriteFields = computed(() =>
  auth.hasPermission(
    record.value ? 'municipal.authorities.update' : 'municipal.authorities.create',
  ),
)
const canPhoto = computed(
  () => isMayor.value && auth.hasPermission('municipal.authorities.photos.update'),
)
const photo = shallowRef<File | null>(null)
const photoValid = ref(true)
const photoDirty = ref(false)
const photoValidating = ref(false)
const photoField = ref<InstanceType<typeof MayorPhotoField>>()
const submitting = ref(false)
const uploading = ref(false)
const partial = ref(false)
const previousEnd = ref('')
const confirmed = ref(false)
const transitionWanted = computed(() => isMayor.value && form.is_current && anotherMayor.value)
const busy = computed(() => submitting.value || photoValidating.value)
const dirty = computed(
  () => metadataDirty.value || photoDirty.value || Boolean(previousEnd.value) || confirmed.value,
)
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })
watch(busy, (value) => emit('busy', value), { flush: 'sync' })
watch(
  () => [
    previousEnd.value,
    form.term_start,
    form.term_end,
    form.is_current,
    props.currentMayor?.id,
  ],
  () => {
    confirmed.value = false
  },
)
function photoChanged(file: File | null, valid: boolean): void {
  photo.value = file
  photoValid.value = valid
}
function persisted(authority: MunicipalAuthority): void {
  record.value = authority
  baseline.value = JSON.stringify(form)
  partial.value = true
  emit('persisted', authority)
}
async function submit(): Promise<void> {
  if (busy.value || !props.writable || !photoValid.value) return
  const validation = isMayor.value
    ? authorityDateErrors(form.term_start, form.term_end, form.is_current)
    : {}
  if (!form.full_name.trim()) validation.full_name = ['Escribe el nombre completo.']
  const termId = Number(form.municipal_term_id)
  if (
    (!record.value || form.municipal_term_id !== '') &&
    (!Number.isSafeInteger(termId) ||
      termId <= 0 ||
      !props.terms?.some((term) => term.id === termId))
  )
    validation.municipal_term_id = ['Selecciona una gestión del municipio.']
  if (isMayor.value && form.is_current && !props.currentKnown)
    validation.is_current = ['Confirma el alcalde vigente antes de cambiar la vigencia.']
  const previous = transitionWanted.value ? props.currentMayor : null
  if (previous) {
    if (
      !previousEnd.value ||
      previousEnd.value > municipalToday() ||
      !form.term_start ||
      previousEnd.value >= form.term_start ||
      (previous.term_start && previousEnd.value < previous.term_start)
    )
      validation.previous_term_end = [
        'El cierre anterior debe ser una fecha no futura, anterior al inicio del nuevo mandato y no anterior al inicio del mandato anterior.',
      ]
    if (!confirmed.value)
      validation.previous_authority_id = ['Confirma expresamente el cambio de alcalde vigente.']
  }
  if (Object.keys(validation).length) {
    error.value = { message: 'Revisa los campos indicados.', errors: validation, status: 422 }
    return
  }
  const fields: AuthorityFields & { full_name: string } = { full_name: form.full_name.trim() }
  if (termId > 0 && termId !== record.value?.municipal_term_id) fields.municipal_term_id = termId
  if (isMayor.value) {
    Object.assign(fields, {
      position_title: form.position_title.trim() || null,
      term_start: form.term_start || null,
      term_end: form.term_end || null,
      source_reference: form.source_reference.trim() || null,
      notes: form.notes.trim() || null,
    })
    if (!record.value) fields.is_current = previous ? false : form.is_current
    else if (!previous && form.is_current !== record.value.is_current)
      fields.is_current = form.is_current
  }
  submitting.value = true
  let complete: MunicipalAuthority | null = null
  try {
    let authority = record.value
    if (!authority) {
      const created = await create({ ...fields, municipal_term_id: termId, role: props.role })
      if (!created) return
      authority = created
      persisted(created)
    } else if (metadataDirty.value) {
      const updated = await update(authority.id, fields)
      if (!updated) return
      authority = updated
      persisted(updated)
    }
    if (previous && !authority.is_current) {
      const activated = await transition(authority.id, {
        previous_authority_id: previous.id,
        previous_term_end: previousEnd.value,
      })
      if (!activated) return
      authority = activated
      persisted(activated)
    }
    if (isMayor.value && photo.value) {
      uploading.value = true
      const uploaded = await uploadPhoto(authority, photo.value)
      if (!uploaded) return
      authority = uploaded
      photoField.value?.clear()
    }
    record.value = authority
    baseline.value = JSON.stringify(form)
    partial.value = false
    complete = authority
  } finally {
    submitting.value = false
    uploading.value = false
  }
  if (complete) emit('saved', complete)
}
</script>
<template>
  <form class="flex min-w-0 flex-col gap-4" @submit.prevent="submit">
    <MunicipalFeedback :error="error" />
    <p
      v-if="partial && !submitting"
      role="status"
      class="rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm"
    >
      Los datos ya están guardados. Completa la operación pendiente y vuelve a guardar; no se creará
      otro registro.
    </p>
    <label class="flex flex-col gap-2 text-sm font-medium"
      >Gestión municipal<select
        v-model="form.municipal_term_id"
        class="kt-select w-full text-foreground"
        :required="!record"
        :disabled="busy || !writable || !canWriteFields"
        :aria-invalid="Boolean(error?.errors.municipal_term_id)"
      >
        <option v-if="!record?.municipal_term_id" value="">
          {{ record ? 'Sin gestión asignada' : 'Selecciona una gestión' }}
        </option>
        <option v-for="term in terms" :key="term.id" :value="term.id">{{ term.label }}</option>
      </select></label
    >
    <MayorPhotoField
      v-if="isMayor"
      ref="photoField"
      :municipality-id="municipalityId"
      :authority="record"
      :editable="canPhoto && writable"
      :disabled="busy || !writable"
      :active="active ?? true"
      @change="photoChanged"
      @busy="photoValidating = $event"
      @dirty="photoDirty = $event"
    />
    <fieldset :disabled="busy || !writable || !canWriteFields" class="flex min-w-0 flex-col gap-4">
      <label class="flex flex-col gap-2 text-sm font-medium"
        >Nombre completo
        <input
          v-model="form.full_name"
          required
          maxlength="200"
          autocomplete="name"
          class="kt-input text-foreground"
          :aria-invalid="Boolean(error?.errors.full_name)"
          :aria-describedby="error?.errors.full_name ? id + '-full_name-error' : undefined"
        />
      </label>
      <span
        :id="id + '-full_name-error'"
        v-if="error?.errors.full_name"
        class="text-xs text-destructive"
        >{{ error.errors.full_name.join(' ') }}</span
      >
      <template v-if="isMayor">
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Cargo
          <input
            v-model="form.position_title"
            :list="id + '-position-options'"
            maxlength="150"
            placeholder="Alcalde municipal o Alcaldesa municipal"
            class="kt-input text-foreground"
            :aria-invalid="Boolean(error?.errors.position_title)"
            :aria-describedby="
              error?.errors.position_title ? id + '-position_title-error' : undefined
            "
          />
          <datalist :id="id + '-position-options'">
            <option value="Alcalde municipal" />
            <option value="Alcaldesa municipal" />
          </datalist>
        </label>
        <span
          :id="id + '-position_title-error'"
          v-if="error?.errors.position_title"
          class="text-xs text-destructive"
          >{{ error.errors.position_title.join(' ') }}</span
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label class="flex flex-col gap-2 text-sm font-medium"
              >Inicio del mandato
              <input
                v-model="form.term_start"
                type="date"
                class="kt-input text-foreground"
                :aria-invalid="Boolean(error?.errors.term_start)"
                :aria-describedby="error?.errors.term_start ? id + '-term_start-error' : undefined"
              />
            </label>
            <span
              :id="id + '-term_start-error'"
              v-if="error?.errors.term_start"
              class="text-xs text-destructive"
              >{{ error.errors.term_start.join(' ') }}</span
            >
          </div>
          <div class="flex flex-col gap-2">
            <label class="flex flex-col gap-2 text-sm font-medium"
              >Finalización del mandato
              <input
                v-model="form.term_end"
                type="date"
                class="kt-input text-foreground"
                :aria-invalid="Boolean(error?.errors.term_end)"
                :aria-describedby="error?.errors.term_end ? id + '-term_end-error' : undefined"
              />
            </label>
            <span
              :id="id + '-term_end-error'"
              v-if="error?.errors.term_end"
              class="text-xs text-destructive"
              >{{ error.errors.term_end.join(' ') }}</span
            >
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm"
          ><input
            v-model="form.is_current"
            type="checkbox"
            class="kt-checkbox"
            :disabled="!canSetCurrent"
            :aria-invalid="Boolean(error?.errors.is_current)"
            :aria-describedby="error?.errors.is_current ? id + '-is_current-error' : undefined"
          />Autoridad vigente</label
        >
        <p
          :id="id + '-is_current-error'"
          v-if="error?.errors.is_current"
          class="text-xs text-destructive"
        >
          {{ error.errors.is_current.join(' ') }}
        </p>
        <div
          v-if="transitionWanted && currentMayor"
          class="flex flex-col gap-3 rounded-xl border border-border p-3 text-sm"
        >
          <p>
            Alcalde vigente anterior: <strong>{{ currentMayor.full_name }}</strong
            >. Su registro y su publicación se conservarán.
          </p>
          <label class="flex flex-col gap-2"
            >Finalización del mandato anterior<input
              v-model="previousEnd"
              type="date"
              required
              :max="municipalToday()"
              class="kt-input text-foreground"
              :aria-invalid="Boolean(error?.errors.previous_term_end)"
          /></label>
          <p v-if="error?.errors.previous_term_end" class="text-xs text-destructive">
            {{ error.errors.previous_term_end.join(' ') }}
          </p>
          <label class="flex items-start gap-2"
            ><input
              v-model="confirmed"
              type="checkbox"
              required
              class="kt-checkbox mt-0.5 shrink-0"
            />Confirmo el cambio de alcalde vigente y la fecha de cierre anterior.</label
          >
        </div>
        <p v-if="!currentKnown" class="text-xs text-muted-foreground">
          La vigencia solo puede cambiarse después de confirmar el estado actual.
        </p>
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Fuente o referencia de información
          <textarea
            v-model="form.source_reference"
            rows="2"
            class="kt-input min-h-20 py-3 text-foreground"
            :aria-invalid="Boolean(error?.errors.source_reference)"
            :aria-describedby="
              error?.errors.source_reference ? id + '-source_reference-error' : undefined
            "
          />
        </label>
        <span
          :id="id + '-source_reference-error'"
          v-if="error?.errors.source_reference"
          class="text-xs text-destructive"
          >{{ error.errors.source_reference.join(' ') }}</span
        >
        <label class="flex flex-col gap-2 text-sm font-medium"
          >Observaciones
          <textarea
            v-model="form.notes"
            rows="3"
            class="kt-input min-h-24 py-3 text-foreground"
            :aria-invalid="Boolean(error?.errors.notes)"
            :aria-describedby="error?.errors.notes ? id + '-notes-error' : undefined"
          />
        </label>
        <span
          :id="id + '-notes-error'"
          v-if="error?.errors.notes"
          class="text-xs text-destructive"
          >{{ error.errors.notes.join(' ') }}</span
        >
        <p class="text-xs text-muted-foreground">
          La publicación controla la visibilidad en el portal y se cambia desde su switch de
          publicación. Es independiente de la vigencia.
        </p>
      </template>
    </fieldset>
    <progress
      v-if="uploading && progress !== null"
      :value="progress"
      max="100"
      class="w-full"
      aria-label="Progreso de subida de fotografía"
    />
    <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        class="kt-btn kt-btn-outline text-foreground"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="kt-btn kt-btn-primary"
        :disabled="busy || !writable || !photoValid || (!canWriteFields && !photoDirty)"
      >
        {{
          uploading
            ? 'Subiendo fotografía…'
            : busy
              ? 'Guardando…'
              : record
                ? 'Guardar cambios'
                : 'Guardar autoridad'
        }}
      </button>
    </div>
  </form>
</template>
