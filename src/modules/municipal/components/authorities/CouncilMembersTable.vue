<script setup lang="ts">
import { authoritiesApi } from '../../api/authorities.api'
import { useMunicipalQuery } from '../../composables/useMunicipalQuery'
import type { MunicipalAuthority } from '../../types/authority.types'
import MunicipalFeedback from '../MunicipalFeedback.vue'
const props = defineProps<{ municipalityId: number; revision: number }>()
const {
  data: members,
  loading,
  error,
  reload,
} = useMunicipalQuery(
  'municipal.authorities.view',
  () => [props.municipalityId, props.revision],
  async (signal) => {
    const members: MunicipalAuthority[] = []
    let page = 1
    let lastPage = 1
    do {
      const response = await authoritiesApi.index(
        props.municipalityId,
        { role: 'council_member', per_page: 100, page },
        signal,
      )
      signal.throwIfAborted()
      members.push(...response.data)
      lastPage = response.meta.last_page
      page += 1
    } while (page <= lastPage)
    return members
  },
)
</script>
<template>
  <section class="kt-card min-w-0 overflow-hidden" aria-label="Concejales municipales">
    <header class="border-b border-border p-4 sm:px-5">
      <h3 class="text-base font-semibold">Concejales municipales</h3>
    </header>
    <MunicipalFeedback v-if="error" :error="error" retry class="m-4" @retry="reload" />
    <div class="max-h-112 overflow-auto" :aria-busy="loading">
      <table class="kt-table w-full table-fixed align-middle">
        <thead class="sticky top-0 z-10 bg-background">
          <tr>
            <th class="w-2/3">Nombre completo</th>
            <th>Vigencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="2" class="py-8 text-center text-sm text-muted-foreground">
              <span role="status">Cargando concejales…</span>
            </td>
          </tr>
          <template v-else-if="!error">
            <tr v-for="member in members" :key="member.id">
              <td class="whitespace-normal break-words text-sm font-medium">
                {{ member.full_name }}
              </td>
              <td>
                <span
                  class="kt-badge kt-badge-outline"
                  :class="member.is_current ? 'kt-badge-primary' : 'kt-badge-secondary'"
                  >{{ member.is_current ? 'Vigente' : 'No vigente' }}</span
                >
              </td>
            </tr>
            <tr v-if="!members?.length">
              <td colspan="2" class="py-8 text-center text-sm text-muted-foreground">
                No hay concejales registrados.
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
