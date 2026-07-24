import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:18001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:18001',
        changeOrigin: true,
      },
    }
  }
})
