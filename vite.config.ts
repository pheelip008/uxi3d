import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js (3D view) and jsPDF are big but load lazily in their own chunks.
    chunkSizeWarningLimit: 1200,
  },
})