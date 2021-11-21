import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    cors: true,
    // https: true,
    proxy: {
      // 使用 proxy 实例
      '/api': {
        target:'http://localhost:8000',
      }
    }
  }
})
