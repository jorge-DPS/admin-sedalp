<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>
<template>
  <div v-if="auth.hasPermission('municipal.poas.view')" class="kt-menu-item">
    <RouterLink
      :to="{ name: 'municipal.poas.index' }"
      data-kt-drawer-dismiss="true"
      class="kt-menu-link gap-2.5 rounded-lg px-2.5 py-2.5 hover:bg-secondary"
      active-class="bg-secondary"
    >
      <span class="kt-menu-icon text-lg text-muted-foreground"
        ><i class="ki-filled ki-document text-lg" aria-hidden="true"
      /></span>
      <span class="kt-menu-title text-sm font-medium text-foreground">POA municipales</span>
    </RouterLink>
  </div>
</template>
