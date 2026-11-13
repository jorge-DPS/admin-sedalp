<script setup lang="ts">
defineProps<{ label: string; icon: string; disabled?: boolean }>()
defineEmits<{ click: [event: MouseEvent] }>()
</script>
<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    class="kt-btn kt-btn-icon kt-btn-ghost min-h-9 min-w-9 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    @click="$emit('click', $event)"
  >
    <i class="ki-filled text-lg" :class="icon" aria-hidden="true" />
  </button>
</template>
