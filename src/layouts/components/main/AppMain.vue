<script setup>
import AppFooter from '@/layouts/components/footer/AppFooter.vue'
</script>

<template>
  <!-- Main -->
  <div
    class="flex min-w-0 flex-col grow bg-background lg:rounded-l-xl lg:overflow-hidden lg:ms-(--sidebar-width)"
  >
    <div
      class="flex flex-col grow kt-scrollable-y-auto lg:[--kt-scrollbar-width:auto] pt-5"
      id="scrollable_content"
    >
      <main class="min-w-0 grow" role="main">
        <RouterView />
      </main>

      <AppFooter />
    </div>
  </div>
</template>
