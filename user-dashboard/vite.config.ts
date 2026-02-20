import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6543',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:6543',
        changeOrigin: true,
        secure: false,
      },
      '/steam-img': {
        target: 'https://cdn.akamai.steamstatic.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/steam-img/, '/steam'),
      },
      '/steam-shared': {
        target: 'https://shared.akamai.steamstatic.com',
        changeOrigin: true,
        secure: true,
        rewrite: path =>
          path.replace(/^\/steam-shared/, '/store_item_assets/steam'),
      },
    },
  },
});
