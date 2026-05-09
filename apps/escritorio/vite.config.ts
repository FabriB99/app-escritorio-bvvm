import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost' // Cambiado para evitar la URL inválida http://:::5173
  },
  resolve: {
    alias: {
      // Sin alias por ahora
    }
  },
  build: {
    target: 'es2021',
  }
});
