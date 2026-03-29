import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './', // Set the root to the current directory
  build: {
    outDir: 'dist', // Output directory for the build
  },
})