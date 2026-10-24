import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// El plugin de rutas debe ir antes que el de React.
// Ver: https://tanstack.com/router/latest/docs/framework/react/installation/with-vite
const pluginsBeforeCompiler = [
  tanstackRouter({ target: 'react', autoCodeSplitting: true }),
  react(),
]

// La PWA usa registerType 'prompt': la actualización se aplica solo cuando
// la persona la confirma, nunca a mitad de un trabajo (sección 9).
const pluginsAfterCompiler = [
  tailwindcss(),
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
      orientation: 'any',
      start_url: '/',
      scope: '/',
      categories: ['business', 'productivity'],
      theme_color: '#2563eb',
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
]

// El compilador de React corre desde el pipeline de Babel solo al compilar.
// Ver: https://react.dev/learn/react-compiler/installation y ADR 0083.
// En desarrollo Babel transforma cada módulo del SPA y el arranque en frío
// pasa de ~2 s a ~6.5 s; el resultado compilado se sigue validando en `build`.
export default defineConfig(({ command }) => {
  const isReactCompilerEnabled =
    command === 'build' || process.env.AXIA_REACT_COMPILER === '1'

  return {
    plugins: [
      ...pluginsBeforeCompiler,
      ...(isReactCompilerEnabled
        ? [babel({ presets: [reactCompilerPreset()] })]
        : []),
      ...pluginsAfterCompiler,
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.AXIA_API_URL ?? 'http://127.0.0.1:3100',
          changeOrigin: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      // Reutiliza un jsdom por worker en lugar de crear uno por archivo.
      pool: 'vmThreads',
      globals: true,
      setupFiles: './src/test/setup.ts',
      // Lo de `e2e/` y `visual/` lo corre Playwright, no Vitest.
      exclude: ['e2e/**', 'visual/**', 'node_modules/**', 'dist/**'],
    },
  }
})
