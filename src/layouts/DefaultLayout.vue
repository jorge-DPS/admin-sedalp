<script setup>
import AppHeader from '@/layouts/components/header/AppHeader.vue'
import AppSidebar from '@/layouts/components/sidebar/AppSidebar.vue'
import AppMain from '@/layouts/components/main/AppMain.vue'
import AppModals from '@/layouts/components/modals/AppModals.vue'
</script>

<template>
  <!-- Base general que se reutiliza en todos los módulos internos -->
  <div class="flex min-h-screen w-full min-w-0 grow">
    <AppHeader />

    <div
      class="flex min-w-0 grow flex-col lg:flex-row pt-(--header-height) lg:pt-0 lg:bg-azul-negro"
    >
      <AppSidebar />
      <AppMain />
    </div>
  </div>

  <!-- Los modales pertenecen al layout y están disponibles en todos los módulos -->
  <AppModals />
</template>
