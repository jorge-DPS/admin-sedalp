<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
const route = useRoute()
const auth = useAuthStore()
const active = computed(
  () =>
    route.name === 'territory.municipalities.index' ||
    String(route.name).startsWith('municipal.poas.'),
)
const expanded = ref(active.value)
watch(
  () => route.name,
  () => {
    if (active.value) expanded.value = true
  },
)
</script>
<template>
  <div v-if="auth.hasPermission('municipalities.view')" class="kt-menu-item">
    <button
      type="button"
      class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="{ 'bg-secondary': active }"
      :aria-expanded="expanded"
      aria-controls="territory-submenu"
      @click="expanded = !expanded"
    >
      <i class="ki-filled ki-geolocation text-lg text-muted-foreground" aria-hidden="true" /><span
        class="grow"
        >Territorio</span
      ><i
        class="ki-filled ki-down text-xs text-muted-foreground transition-transform"
        :class="{ 'rotate-180': expanded }"
        aria-hidden="true"
      />
    </button>
    <nav
      v-show="expanded"
      id="territory-submenu"
      aria-label="Secciones de territorio"
      class="ms-5 mt-2 flex flex-col gap-1 border-s border-white/10 ps-3"
    >
      <RouterLink
        :to="{ name: 'territory.municipalities.index' }"
        data-kt-drawer-dismiss="true"
        active-class=""
        exact-active-class=""
        class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          active
            ? 'bg-primary/20 font-medium text-cobre'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        "
      >
        <i class="ki-filled ki-geolocation text-base" aria-hidden="true" />Municipios
      </RouterLink>
    </nav>
  </div>
</template>
