<script setup lang="ts">
import { useId } from 'vue'
defineProps<{ title: string; busy?: boolean; embedded?: boolean }>()
const id = useId()
</script>
<template>
  <section
    :class="embedded ? 'min-w-0' : 'kt-card min-w-0'"
    :aria-label="embedded ? title : undefined"
    :aria-labelledby="embedded ? undefined : id"
    :aria-busy="busy"
  >
    <header
      v-if="!embedded"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"
    >
      <h2 :id="id" class="kt-card-title">{{ title }}</h2>
      <slot name="description" />
    </header>
    <div :class="embedded ? undefined : 'p-5 sm:p-6'"><slot /></div>
  </section>
</template>
