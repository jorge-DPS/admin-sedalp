<script setup lang="ts">
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>
<template>
  <header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
    <div class="min-w-0">
      <h2 :id="headingId" class="break-words text-lg font-semibold tracking-tight">{{ title }}</h2>
      <p v-if="description" class="mt-1 break-words text-sm text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
