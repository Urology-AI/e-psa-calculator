import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages configuration for static demo
export default defineConfig({
  plugins: [react()],
  base: '/e-psa-calculator/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  },
  define: {
    // Disable Firebase for GitHub Pages demo
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_DISABLE_FIREBASE': JSON.stringify('true')
  }
})
