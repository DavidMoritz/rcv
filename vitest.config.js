import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['test/setup.js'],
    include: ['test/**/*.test.js'],
    exclude: ['test/contract/**/*.test.js']
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src')
    }
  }
});
