<template>
  <header
    class="flex lg:hidden items-center fixed z-10 top-0 inset-s-0 inset-e-0 shrink-0 bg-azul-negro border-b border-white/10 text-white h-(--header-height)"
    id="header"
  >
    <!-- Container -->
    <div class="kt-container-fixed flex items-center justify-between flex-wrap gap-3">
      <RouterLink to="/" class="flex items-center gap-2.5">
        <img
          class="h-8.5 w-auto object-contain"
          src="/media/branding/logo_la_paz_sin_margenes.png"
          alt="Gobernación de La Paz"
        />
        <div class="flex flex-col border-s border-white/20 ps-2 leading-tight">
          <span class="text-sm font-semibold tracking-wider text-crema">SEDALP</span>
        </div>
      </RouterLink>
      <button
        class="kt-btn kt-btn-icon kt-btn-ghost text-crema hover:bg-white/10 -me-2"
        data-kt-drawer-toggle="#sidebar"
        aria-label="Abrir menú"
      >
        <i class="ki-filled ki-menu text-xl"></i>
      </button>
    </div>
    <!-- End of Container -->
  </header>
</template>
