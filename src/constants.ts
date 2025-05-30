/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Application Configuration Constants
export const APP_CONFIG = {
  // Chart dimensions and settings
  CHART: {
    DEFAULT_WIDTH: 400,
    DEFAULT_HEIGHT: 200,
    ASPECT_RATIO: 2,
    BORDER_WIDTH: 1,
    PADDING: 10,
    ANIMATION_DURATION: 750,
  },
  
  // Timing and intervals (in milliseconds)
  TIMING: {
    AUTO_SAVE_INTERVAL: 30000,        // 30 seconds
    PERFORMANCE_OPTIMIZATION: 30000,   // 30 seconds
    DEBOUNCE_DELAY: 300,              // 300ms
    THROTTLE_DELAY: 100,              // 100ms
    WAVEFORM_THROTTLE: 50,            // 50ms
    TOAST_DURATION: 5000,             // 5 seconds
    SUGGESTION_UPDATE_INTERVAL: 5000,  // 5 seconds
    REAL_TIME_PROCESSING: 2000,       // 2 seconds
  },
  
  // Retry and error handling
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_BASE: 1000,               // 1 second base delay
    BACKOFF_MULTIPLIER: 2,
    NETWORK_TIMEOUT: 10000,           // 10 seconds
  },
  
  // Memory and performance limits
  PERFORMANCE: {
    MAX_CACHE_ENTRIES: 100,
    CACHE_EXPIRY: 300000,             // 5 minutes
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    MAX_CHART_INSTANCES: 10,
    MAX_HISTORY_ENTRIES: 50,
    CLEANUP_INTERVAL: 60000,          // 1 minute
  },
  
  // Buffer and storage limits
  STORAGE: {
    MAX_TRANSCRIPT_LENGTH: 50000,     // 50k characters
    MAX_NOTE_LENGTH: 100000,          // 100k characters
    MAX_NOTES_STORED: 1000,
    COMPRESSION_THRESHOLD: 10000,     // 10k characters
  },
  
  // UI and styling
  UI: {
    WAVEFORM_BARS: 20,
    WAVEFORM_MAX_HEIGHT: 100,
    ANIMATION_EASING: 'ease-in-out',
    TOAST_STACK_LIMIT: 5,
  }
} as const;

// Color scheme constants
export const COLORS = {
  // Primary colors
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
  SUCCESS: '#28a745',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  
  // Chart colors
  CHART: {
    RED: 'rgba(255, 99, 132, 0.2)',
    BLUE: 'rgba(54, 162, 235, 0.2)', 
    YELLOW: 'rgba(255, 205, 86, 0.2)',
    GREEN: 'rgba(75, 192, 192, 0.2)',
    PURPLE: 'rgba(153, 102, 255, 0.2)',
    ORANGE: 'rgba(255, 159, 64, 0.2)',
  },
  
  // Chart border colors
  CHART_BORDER: {
    RED: 'rgba(255, 99, 132, 1)',
    BLUE: 'rgba(54, 162, 235, 1)',
    YELLOW: 'rgba(255, 205, 86, 1)',
    GREEN: 'rgba(75, 192, 192, 1)',
    PURPLE: 'rgba(153, 102, 255, 1)',
    ORANGE: 'rgba(255, 159, 64, 1)',
  },
  
  // Status colors
  STATUS: {
    ONLINE: '#28a745',
    OFFLINE: '#dc3545',
    RECORDING: '#dc3545',
    PROCESSING: '#ffc107',
    IDLE: '#6c757d',
  }
} as const;

// API Configuration
export const API_CONFIG = {
  GEMINI: {
    MODEL_NAME: 'gemini-2.5-flash-preview-04-17',
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.7,
    TOP_P: 0.8,
    TOP_K: 40,
  },
  
  ENDPOINTS: {
    TRANSCRIPTION: '/api/transcription',
    POLISH: '/api/polish',
    CHARTS: '/api/charts',
    ANALYSIS: '/api/analysis',
  }
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: {
    OFFLINE: 'You are currently offline. Some features may not be available.',
    TIMEOUT: 'Request timed out. Please check your connection and try again.',
    FAILED: 'Network request failed. Please try again.',
  },
  
  MICROPHONE: {
    NOT_SUPPORTED: 'Your browser does not support audio recording.',
    PERMISSION_DENIED: 'Microphone access denied. Please grant permission to record.',
    NOT_FOUND: 'No microphone found. Please connect a microphone.',
    GENERIC_ERROR: 'Error accessing microphone. Please try again.',
  },
  
  CHARTS: {
    CREATION_FAILED: 'Failed to create chart. Please try again.',
    NO_DATA: 'No data available to create chart.',
    INVALID_CONFIG: 'Invalid chart configuration.',
  },
  
  STORAGE: {
    QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear some data.',
    NOT_AVAILABLE: 'Local storage is not available.',
    CORRUPTED: 'Stored data appears to be corrupted.',
  }
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  RECORDING: {
    STARTED: 'Recording started successfully',
    STOPPED: 'Recording stopped',
    SAVED: 'Recording saved successfully',
  },
  
  CHARTS: {
    GENERATED: 'Charts generated successfully',
    UPDATED: 'Charts updated',
  },
  
  EXPORT: {
    COMPLETED: 'Export completed successfully',
    COPIED: 'Content copied to clipboard',
  }
} as const;

// Environment detection
export const ENV = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

// Logging levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];
