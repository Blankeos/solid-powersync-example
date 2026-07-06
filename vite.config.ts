import vikeRoutegen from "@blankeos/vike-routegen"
import tailwindcss from "@tailwindcss/vite"
import vike from "vike/plugin"
import vikeSolid from "vike-solid/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
export default defineConfig({
  plugins: [
    vike(),
    vikeSolid(),
    vikeRoutegen(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: ["logo.svg"],
      manifest: {
        name: "Solid Notes",
        short_name: "Notes",
        description: "Local-first notes with PowerSync",
        theme_color: "#2563eb",
        background_color: "#f9fafb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,svg,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/, /^\/up/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        // Only workaround to run dev, don't run the plugin: https://github.com/vikejs/vike/issues/388#issuecomment-1199280084
        enabled: false,
      },
    }),
  ],
  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
  preview: { port: 3000 },
  envPrefix: ["PUBLIC_"],
  optimizeDeps: {
    exclude: ["@powersync/web"],
  },
  worker: {
    format: "es",
  },
})
