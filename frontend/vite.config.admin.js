import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Build configuration for admin
  build: {
    outDir: 'admin-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  
  // Development server
  server: {
    port: 3001, // Different port from main app
    host: true,
    open: '/admin.html'
  },
  
  // Preview server
  preview: {
    port: 3002,
    host: true
  },
  
  // Resolve paths
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // Environment variables
  define: {
    __ADMIN_MODE__: true
  },
  
  // Environment variables for admin
  env: {
    VITE_USE_AUTH_EMULATOR: 'false',
    VITE_USE_FUNCTIONS_EMULATOR: 'false',
    VITE_ADMIN_MODE: 'true'
  }
});
