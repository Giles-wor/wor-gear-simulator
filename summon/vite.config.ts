import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: '/wor-gear-simulator/summon/',
  build: {
    outDir: resolve(__dirname, '../dist/summon'),
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
