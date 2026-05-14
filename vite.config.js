import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import htmlIncludes from './vite-plugin-html-includes.js';
import path from 'path';

export default defineConfig({
  root: 'src',
  base: '/',

  // Optimize dependencies - pre-bundle these for better performance
  optimizeDeps: {
    include: [
      'jquery',
      'lodash',
      'moment',
      'angular',
      'bootstrap',
      'angular-animate',
      'angular-ui-bootstrap',
      'jquery-ui-touch-punch'
    ]
  },

  // Define global constants that will be replaced at build time
  define: {
    global: 'window'
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html')
      },
      output: {
        // Keep similar structure to production
        entryFileNames: 'inc/[name]-[hash].js',
        chunkFileNames: 'inc/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // CSS files go to inc/
          if (assetInfo.name.endsWith('.css')) {
            return 'inc/[name]-[hash][extname]';
          }
          // Everything else at root or respective directories
          return '[name][extname]';
        },
        // Split vendor code (libraries) from app code for better caching
        manualChunks: (id) => {
          // Put all node_modules dependencies into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },

  plugins: [
    htmlIncludes(),
    viteStaticCopy({
      targets: [
        // Copy local library fallbacks
        {
          src: 'lib',
          dest: '.'
        },
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
        // Copy timezone-picker.js (loaded as script tag, not bundled)
        {
          src: 'inc/timezone-picker.js',
          dest: 'inc'
        },
        // Copy service worker (deregistration script)
        {
          src: 'sw.js',
          dest: '.'
        },
        // Copy It's a Wrap app
        {
          src: 'wrap.html',
          dest: '.'
        },
        {
          src: 'wrap_files',
          dest: '.'
        },
        // Copy static files
        {
          src: 'favicon.ico',
          dest: '.'
        },
        {
          src: 'favicon-16x16.png',
          dest: '.'
        },
        {
          src: 'favicon-32x32.png',
          dest: '.'
        },
        {
          src: 'android-chrome-192x192.png',
          dest: '.'
        },
        {
          src: 'android-chrome-512x512.png',
          dest: '.'
        },
        {
          src: 'apple-touch-icon.png',
          dest: '.'
        },
        {
          src: 'site.webmanifest',
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
        },
        {
          src: 'admin.html',
          dest: '.'
        }
      ]
    })
  ],

  server: {
    port: 2460,
    open: true,
    proxy: {
      // Proxy API requests to PHP backend
      '/api': {
        target: 'http://localhost:2461',
        changeOrigin: true,
        secure: false
      }
    }
  },

  serveV2: {
    port: 2460,
    open: true,
    proxy: {
      // Proxy API requests to PHP backend
      '/api': {
        target: 'https://rankedchoices.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => '/v2' + path
      }
    }
  }
});
