import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      port: 5173,
      protocol: 'ws',
      host: '127.0.0.1',
    },
  },
})
