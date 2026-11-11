<script setup lang="ts">
import type { PaginationMeta } from '@/shared/api/types'

withDefaults(defineProps<{ meta: PaginationMeta | null; loading?: boolean; label?: string }>(), {
  loading: false,
  label: 'Paginación de municipios',
})
defineEmits<{ page: [value: number] }>()
</script>

<template>
  <nav
    v-if="meta"
    :aria-label="label"
    class="flex flex-wrap items-center justify-between gap-3 text-sm text-secondary-foreground"
  >
    <span aria-live="polite"
      >Mostrando {{ meta.from ?? 0 }}–{{ meta.to ?? 0 }} de {{ meta.total }}</span
    >
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
        :disabled="loading || meta.current_page <= 1"
        @click="$emit('page', meta.current_page - 1)"
      >
        Anterior
      </button>
      <span>Página {{ meta.current_page }} de {{ meta.last_page }}</span>
      <button
        type="button"
        class="kt-btn kt-btn-sm kt-btn-outline text-foreground"
        :disabled="loading || meta.current_page >= meta.last_page"
        @click="$emit('page', meta.current_page + 1)"
      >
        Siguiente
      </button>
    </div>
  </nav>
</template>
