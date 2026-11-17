import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg'],
      manifest: {
        name: 'Bitácora de Obra',
        short_name: 'Bitácora',
        description: 'Registro diario de avance de obra con fotos y notas técnicas.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#0a0a0a',
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Manejo de notificaciones push (public/sw-push.js)
        importScripts: ['sw-push.js'],
        navigateFallback: '/index.html',
        // No interceptar las funciones de Netlify con el fallback de la SPA
        navigateFallbackDenylist: [/^\/\.netlify\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Fotos públicas de Supabase Storage: inmutables (ruta con UUID) → cache-first.
            // Los <img> usan crossOrigin="anonymous": así las respuestas son CORS (status 200)
            // y no opacas, que Chrome contabiliza con ~7 MB de relleno cada una.
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/fotos-avance/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-obra',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
