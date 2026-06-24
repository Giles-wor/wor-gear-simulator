import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: '/wor-gear-simulator/leaks/',
  build: {
    outDir: resolve(__dirname, '../dist/leaks'),
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
