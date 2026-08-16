import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@rankedchoices/rcv-core': fileURLToPath(
        new URL('../../packages/rcv-core/src/index.ts', import.meta.url),
      ),
      'react-native': 'react-native-web',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
