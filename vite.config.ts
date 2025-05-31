/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Environment variables with VITE_ prefix are automatically available
      // No need to manually define them in the define section
      define: {
        // Legacy support for any remaining process.env references
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable code splitting for optimal bundle size
        rollupOptions: {
          output: {
            // Manual chunking for better code splitting
            manualChunks: {
              // Core application logic
              'app-core': [
                './src/components/AudioTranscriptionApp.ts',
                './src/services/APIService.ts',
                './src/services/DataProcessor.ts'
              ],
              // Performance monitoring
              'performance': [
                './src/services/PerformanceMonitor.ts',
                './src/services/IntervalManager.ts',
                './src/services/BundleOptimizer.ts'
              ],
              // Audio processing
              'audio': [
                './src/services/AudioRecorder.ts'
              ],
              // Chart visualization (lazy loaded)
              'charts': [
                './src/services/ChartManager.ts'
              ],
              // Utilities and types
              'utils': [
                './src/utils.ts',
                './src/types/index.ts',
                './src/constants.ts'
              ],
              // External dependencies
              'vendor-chart': ['chart.js'],
              'vendor-ai': ['@google/genai'],
              'vendor-utils': ['marked']
            },
            // Naming pattern for chunks
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId || '';
              
              if (facadeModuleId.includes('chart')) {
                return 'chunks/charts-[hash].js';
              }
              if (facadeModuleId.includes('service')) {
                return 'chunks/services-[hash].js';
              }
              if (facadeModuleId.includes('performance')) {
                return 'chunks/performance-[hash].js';
              }
              
              return 'chunks/[name]-[hash].js';
            },
            // Asset naming
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        },
        // Optimize chunk size limits
        chunkSizeWarningLimit: 1000,
        // Enable minification for production
        minify: mode === 'production' ? 'esbuild' : false,
        // Source maps for debugging
        sourcemap: mode === 'development',
        // Target modern browsers for better optimization
        target: ['es2020', 'chrome80', 'firefox78', 'safari13'],
        // Optimize CSS
        cssCodeSplit: true,
        // Production optimizations
        reportCompressedSize: mode === 'production',
        // Terser options for production
        terserOptions: mode === 'production' ? {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug']
          },
          mangle: {
            safari10: true
          }
        } : undefined
      },
      // Optimize dependency pre-bundling
      optimizeDeps: {
        include: [
          // Pre-bundle core dependencies
          '@google/genai',
          'marked'
        ],
        exclude: [
          // Exclude chart.js for lazy loading
          'chart.js'
        ]
      },
      // Enable performance monitoring in development
      server: {
        // Enable CORS for API calls
        cors: true,
        // Enable compression
        middlewareMode: false
      },
      test: {
        globals: true, // Use Vitest global APIs
        environment: 'jsdom', // Set up a DOM environment for tests
        setupFiles: [], // Optional: for setup files e.g. './src/setupTests.ts'
        include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'], // Test file patterns
        coverage: { // Optional: basic coverage configuration
          reporter: ['text', 'json', 'html'],
          provider: 'v8' // or 'istanbul'
        }
      },
    };
});
