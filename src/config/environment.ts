/**
 * Production Environment Configuration
 * Centralizes all production-specific settings and feature flags
 */

// Environment detection
export const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';
export const IS_DEVELOPMENT = import.meta.env.DEV;

// Application configuration
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Voice Notes Pro',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  domain: import.meta.env.VITE_DOMAIN || 'voicenotes.app',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.voicenotes.app'
};

// Feature flags
export const FEATURES = {
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  errorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  consoleLogs: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true',
  testFeatures: import.meta.env.VITE_ENABLE_TEST_FEATURES === 'true'
};

// Security configuration
export const SECURITY = {
  secureMode: import.meta.env.VITE_SECURE_MODE === 'true',
  corsEnabled: import.meta.env.VITE_CORS_ENABLED === 'true'
};

// API configuration
export const API_CONFIG = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
};

// Performance configuration
export const PERFORMANCE = {
  bundleAnalyzer: import.meta.env.VITE_BUNDLE_ANALYZER === 'true',
  minify: import.meta.env.VITE_MINIFY !== 'false',
  treeShaking: import.meta.env.VITE_TREE_SHAKING !== 'false'
};

// Monitoring configuration
export const MONITORING = {
  logLevel: import.meta.env.VITE_LOG_LEVEL || (IS_PRODUCTION ? 'error' : 'debug'),
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID
};

// CDN and asset configuration
export const ASSETS = {
  cdnUrl: import.meta.env.VITE_CDN_URL || 'https://cdn.jsdelivr.net',
  assetsUrl: import.meta.env.VITE_ASSETS_URL || '/assets'
};

// Chart.js CDN configuration for production
export const CHART_CONFIG = {
  version: '4.4.9',
  cdnUrl: `${ASSETS.cdnUrl}/npm/chart.js@4.4.9/dist/chart.min.js`
};

// Export utility functions
export const getEnvironmentInfo = () => ({
  environment: IS_PRODUCTION ? 'production' : 'development',
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
  features: FEATURES,
  config: APP_CONFIG
});

// Console logging wrapper that respects production settings
export const log = {
  debug: (...args: any[]) => {
    if (FEATURES.consoleLogs || IS_DEVELOPMENT) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (FEATURES.consoleLogs || IS_DEVELOPMENT) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (FEATURES.consoleLogs || MONITORING.logLevel !== 'error') {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args);
  }
};

// Environment validation
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required environment variables for production
  if (IS_PRODUCTION) {
    if (!API_CONFIG.geminiApiKey) {
      errors.push('VITE_GEMINI_API_KEY is required for production');
    }
    
    if (!APP_CONFIG.domain) {
      errors.push('VITE_DOMAIN should be set for production');
    }
    
    if (FEATURES.analytics && !MONITORING.googleAnalyticsId) {
      errors.push('VITE_GOOGLE_ANALYTICS_ID is required when analytics is enabled');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Initialize environment
export const initializeEnvironment = () => {
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    log.error('Environment validation failed:', validation.errors);
    if (IS_PRODUCTION) {
      throw new Error(`Production environment validation failed: ${validation.errors.join(', ')}`);
    }
  }
  
  log.info('Environment initialized:', getEnvironmentInfo());
  return validation.valid;
};
