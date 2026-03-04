import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    globals: false,
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false,
    },
  },
  define: {
    'process.env': process.env,
  },
})
