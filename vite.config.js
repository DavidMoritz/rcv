import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  root: 'src',
  base: '/',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
      },
      output: {
        // Keep similar structure to production
        entryFileNames: 'inc/[name].js',
        chunkFileNames: 'inc/[name].js',
        assetFileNames: (assetInfo) => {
          // CSS files go to inc/
          if (assetInfo.name.endsWith('.css')) {
            return 'inc/[name][extname]';
          }
          // Everything else at root or respective directories
          return '[name][extname]';
        }
      }
    }
  },

  plugins: [
    viteStaticCopy({
      targets: [
        // Copy PHP API files
        {
          src: 'api',
          dest: '.'
        },
        // Copy fonts
        {
          src: 'fonts',
          dest: '.'
        },
        // Copy images
        {
          src: 'img',
          dest: '.'
        },
        // Copy HQ directory
        {
          src: 'hq',
          dest: '.'
        },
        // Copy static files
        {
          src: 'favicon.ico',
          dest: '.'
        },
        {
          src: 'apple-touch-icon.png',
          dest: '.'
        },
        {
          src: 'github-fork.png',
          dest: '.'
        },
        {
          src: '.htaccess',
          dest: '.'
        },
        {
          src: 'sw.js',
          dest: '.'
        },
        {
          src: 'terms-of-service.html',
          dest: '.'
        },
        {
          src: 'secure-elections-instructions.html',
          dest: '.'
        },
        {
          src: 'results_json.html',
          dest: '.'
        }
      ]
    })
  ],

  server: {
    port: 3000,
    open: true
  }
});
