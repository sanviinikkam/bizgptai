import { defineConfig } from 'vite';
/// <reference types="node" />
import path from 'path';
import react from '@vitejs/plugin-react';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
   resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'backend')
     }
   },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
