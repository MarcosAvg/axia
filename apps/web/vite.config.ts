import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// El plugin de rutas debe ir antes que el de React.
// Ver: https://tanstack.com/router/latest/docs/framework/react/installation/with-vite
// El compilador de React corre desde el pipeline de Babel.
// Ver: https://react.dev/learn/react-compiler/installation
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // La PWA usa registerType 'prompt': la actualización se aplica solo cuando
    // la persona la confirma, nunca a mitad de un trabajo (sección 9).
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Axia',
        short_name: 'Axia',
        description: 'Seguimiento de tiquets de mantenimiento',
        lang: 'es-MX',
        id: '/',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity'],
        theme_color: '#0f172a',
        background_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // El cliente de Supabase exige URL y clave al construirse; en pruebas no llega
    // a hacer red (los hooks se sustituyen), así que basta con valores ficticios.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'clave-anon-de-prueba',
    },
    // Lo de `e2e/` lo corre Playwright, no Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
