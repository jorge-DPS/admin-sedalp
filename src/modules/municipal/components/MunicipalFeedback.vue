<script setup lang="ts">
import type { ApiError } from '@/shared/api/errors'
defineProps<{ error: ApiError | null; retry?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div
    v-if="error"
    role="alert"
    class="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
  >
    <p>{{ error.message }}</p>
    <ul v-if="Object.keys(error.errors).length" class="mt-2 list-disc ps-5">
      <li v-for="(messages, field) in error.errors" :key="field">{{ messages.join(' ') }}</li>
    </ul>
    <button
      v-if="retry && error.status !== 403 && error.status !== 404 && error.status !== 401"
      class="kt-btn kt-btn-sm kt-btn-outline mt-3 text-foreground"
      type="button"
      @click="$emit('retry')"
    >
      Reintentar consulta
    </button>
  </div>
</template>
