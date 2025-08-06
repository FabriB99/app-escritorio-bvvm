import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,  // para que no arranque en otro puerto
    host: true // para acceso desde LAN (opcional)
  },
  resolve: {
    alias: {
      // Por ahora no alias compartidos para evitar quilombos
    }
  },
  build: {
  target: 'es2021',
  }
});
