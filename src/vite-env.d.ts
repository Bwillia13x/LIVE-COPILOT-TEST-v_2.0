/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_APP_ENV: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DOMAIN: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_REPORTING: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_ENABLE_CONSOLE_LOGS: string
  readonly VITE_ENABLE_TEST_FEATURES: string
  readonly VITE_SECURE_MODE: string
  readonly VITE_CORS_ENABLED: string
  readonly VITE_BUNDLE_ANALYZER: string
  readonly VITE_MINIFY: string
  readonly VITE_TREE_SHAKING: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GOOGLE_ANALYTICS_ID: string
  readonly VITE_CDN_URL: string
  readonly VITE_ASSETS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
