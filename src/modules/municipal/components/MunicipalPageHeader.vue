<script setup lang="ts">
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>
<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      <h2 :id="headingId" class="text-xl font-semibold tracking-tight">{{ title }}</h2>
      <p v-if="description" class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
