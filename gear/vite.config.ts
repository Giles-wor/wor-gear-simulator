import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: '/wor-gear-simulator/gear/',
  build: {
    outDir: resolve(__dirname, '../dist/gear'),
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
