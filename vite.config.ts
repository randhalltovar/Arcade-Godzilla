import { defineConfig } from 'vite';
import { arcadeDevUI } from '@platanus/arcade-dev-ui-26';

export default defineConfig({
  root: '.',
  server: {
    port: 3001,
    open: false,
  },
  plugins: [arcadeDevUI()],
  optimizeDeps: {
    exclude: ['phaser'],
  },
});
