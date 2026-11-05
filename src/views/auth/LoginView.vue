<script setup>
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticating: loading } = storeToRefs(authStore)

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const error = ref('')

const login = async () => {
  if (loading.value) return

  error.value = ''
  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })

    // Después del login vamos al Dashboard
    await router.replace({
      name: 'dashboard',
    })
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Correo electrónico o contraseña incorrectos.'
      return
    }

    if (err.response?.status === 422) {
      error.value = 'Revise los datos ingresados.'
      return
    }

    if (err.code === 'ECONNABORTED') {
      error.value = 'El servidor tardó demasiado en responder.'
      return
    }

    if (err.code === 'ERR_NETWORK') {
      error.value = 'No se pudo conectar con el servidor.'
      return
    }

    error.value = 'Ocurrió un error al iniciar sesión.'
  }
}
</script>

<template>
  <div
    class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F8F7F3] dark:bg-[#131922] px-4 py-8"
  >
    <!-- Ondas decorativas institucionales en el fondo (Manual de Marca Págs. 1, 8 y 9) -->
    <div
      class="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5"
    ></div>
    <div
      class="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-azul-negro/10 blur-3xl dark:bg-azul-negro/30"
    ></div>

    <!-- Curva gráfica inferior inspirada en la papelería oficial -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-primary via-azul-negro to-primary"
    ></div>

    <div class="relative z-10 w-full max-w-[420px]">
      <div
        class="kt-card border border-border/80 shadow-lg shadow-black/5 dark:shadow-black/20"
      >
        <form class="kt-card-content flex flex-col gap-5 p-8 sm:p-10" @submit.prevent="login">
          <!-- Identidad Oficial: Logotipo Cobre sobre Fondo Claro -->
          <div class="flex flex-col items-center text-center">
            <img
              src="/media/branding/la-paz-01.png"
              alt="Gobernación de La Paz - Departamento Maravilloso"
              class="h-16 w-auto object-contain dark:hidden mb-2"
            />
            <img
              src="/media/branding/la-paz-04.png"
              alt="Gobernación de La Paz - Departamento Maravilloso"
              class="h-16 w-auto object-contain hidden dark:block mb-2"
            />

            <h1 class="text-xl font-semibold text-foreground tracking-tight">
              Sistema SEDALP
            </h1>
            <p class="text-xs text-gris-funcional mt-0.5">
              Gobierno Autónomo Departamental de La Paz
            </p>
          </div>

          <div class="border-t border-border/60"></div>

          <!-- Mensaje de error -->
          <div
            v-if="error"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {{ error }}
          </div>

          <!-- Correo electrónico -->
          <div class="flex flex-col gap-1.5">
            <label for="email" class="kt-form-label text-foreground font-medium text-xs">
              Correo institucional
            </label>

            <input
              id="email"
              v-model.trim="email"
              class="kt-input"
              type="email"
              placeholder="funcionario@lapaz.gob.bo"
              autocomplete="email"
              :disabled="loading"
              required
            />
          </div>

          <!-- Contraseña -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="password" class="kt-form-label text-foreground font-medium text-xs">
                Contraseña
              </label>
            </div>

            <div class="kt-input">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Ingrese su credencial"
                autocomplete="current-password"
                :disabled="loading"
                required
              />

              <button
                class="kt-btn kt-btn-sm kt-btn-ghost kt-btn-icon -me-1.5 bg-transparent!"
                type="button"
                :disabled="loading"
                aria-label="Mostrar u ocultar contraseña"
                @click="showPassword = !showPassword"
              >
                <i
                  :class="
                    showPassword
                      ? 'ki-filled ki-eye-slash text-gris-funcional'
                      : 'ki-filled ki-eye text-gris-funcional'
                  "
                ></i>
              </button>
            </div>
          </div>

          <!-- Botón iniciar sesión -->
          <button
            class="kt-btn kt-btn-primary flex grow justify-center font-medium mt-2 shadow-sm"
            type="submit"
            :disabled="loading"
          >
            <template v-if="loading">
              <span
                class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent me-2"
              ></span>
              Ingresando al sistema...
            </template>

            <template v-else>
              <i class="ki-filled ki-entrance-right me-1.5"></i>
              Iniciar sesión
            </template>
          </button>
        </form>
      </div>

      <!-- Pie de login institucional -->
      <p class="mt-6 text-center text-xs text-gris-funcional">
        Órgano Ejecutivo Departamental de La Paz • Gestión Institucional
      </p>
    </div>
  </div>
</template>
