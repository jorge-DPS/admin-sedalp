<script setup lang="ts">
import type { Municipality } from '../types/territory.types'
import { municipalDate } from '@/modules/municipal/utils/municipal.format'
import MunicipalPageHeader from '@/modules/municipal/components/MunicipalPageHeader.vue'
defineProps<{ municipality: Municipality }>()
</script>
<template>
  <div class="flex min-w-0 flex-col gap-5">
    <MunicipalPageHeader
      title="Ficha municipal"
      description="Datos de identificación y ubicación territorial."
    />
    <section class="kt-card min-w-0 overflow-hidden" aria-label="Ficha institucional del municipio">
      <div class="p-5 sm:p-6">
        <h3 class="border-b border-border pb-4 text-base font-semibold">Identificación</h3>
        <dl class="divide-y divide-border text-sm">
          <div class="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt class="text-muted-foreground">Nombre oficial</dt>
            <dd class="min-w-0 break-words font-semibold">{{ municipality.name }}</dd>
          </div>
          <div class="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt class="text-muted-foreground">Código oficial</dt>
            <dd class="font-medium tabular-nums">
              {{ municipality.official_code || 'No informado' }}
            </dd>
          </div>
          <div class="grid gap-2 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt class="text-muted-foreground">Estado administrativo</dt>
            <dd>
              <span
                class="kt-badge kt-badge-outline"
                :class="municipality.active ? 'kt-badge-success' : 'kt-badge-secondary'"
                >{{ municipality.active ? 'Activo' : 'Inactivo' }}</span
              >
            </dd>
          </div>
        </dl>
        <h3 class="border-t border-border pt-5 text-base font-semibold">Ubicación territorial</h3>
        <dl class="grid gap-5 pt-4 text-sm sm:grid-cols-2">
          <div class="min-w-0">
            <dt class="text-muted-foreground">Provincia</dt>
            <dd class="mt-1.5 break-words font-semibold">
              {{ municipality.province?.name || 'No informada' }}
            </dd>
          </div>
          <div class="min-w-0 sm:border-s sm:border-border sm:ps-6">
            <dt class="text-muted-foreground">Región</dt>
            <dd class="mt-1.5 break-words font-semibold">
              {{ municipality.region?.name || 'No informada' }}
            </dd>
          </div>
        </dl>
      </div>
      <dl
        class="flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-border bg-muted/15 px-5 py-4 text-xs sm:px-6"
      >
        <div class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">Fecha de registro</dt>
          <dd>{{ municipalDate(municipality.created_at) }}</dd>
        </div>
        <div class="flex flex-wrap gap-2">
          <dt class="text-muted-foreground">Última actualización</dt>
          <dd>{{ municipalDate(municipality.updated_at) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
