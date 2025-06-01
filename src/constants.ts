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
  },
  
  // Chart helper arrays (for convenience)
  chartBackgrounds: [
    'rgba(255, 99, 132, 0.2)',
    'rgba(54, 162, 235, 0.2)', 
    'rgba(255, 205, 86, 0.2)',
    'rgba(75, 192, 192, 0.2)',
    'rgba(153, 102, 255, 0.2)',
    'rgba(255, 159, 64, 0.2)',
  ],
  
  chartBorders: [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 205, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
  ],
  
  primary: '#007bff',
  primaryLight: 'rgba(0, 123, 255, 0.2)'
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
  },
  // Default model for Gemini
  DEFAULT_MODEL_NAME: 'gemini-2.5-flash-preview-04-17',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  API_KEY: 'geminiApiKey',
  THEME: 'voice-notes-theme',
  NOTES_DATA: 'voiceNotesData', // For DataProcessor
} as const;

// UI Identifiers and Selectors (add more as needed)
export const UI_IDS = {
  // Tabs & Content Panes
  TAB_RAW: 'raw',
  TAB_NOTE: 'note', // Corresponds to 'polishedNote' content
  CONTENT_PANE_RAW: 'rawTranscription',
  CONTENT_PANE_POLISHED: 'polishedNote',
  // Charting
  CHART_DISPLAY_AREA: 'aiChartDisplayArea',
  // Other common element IDs can be added if necessary
  SETTINGS_MODAL: 'settingsModal',
  API_KEY_INPUT: 'apiKeyInput',
  // File Upload Elements
  FILE_DROP_ZONE: 'fileDropZone',
  FILE_INPUT: 'fileInput',
  UPLOAD_FILES_BTN: 'uploadFilesBtn',
  // Content Library Panel
  CONTENT_LIBRARY_PANEL: 'contentLibraryPanel',
  CONTENT_LIBRARY_BUTTON: 'contentLibraryButton', // Assuming this is the button to open the panel
  CLOSE_LIBRARY_BUTTON: 'closeLibrary', // Button to close the panel - updated as per instruction
  FILES_LIST: 'filesList', // The UL or DIV to list files
  ANALYZE_CONTENT_BUTTON: 'analyzeContentButton', // Repurposed testAggregateButton
  CONSOLIDATED_TOPICS_DISPLAY: 'consolidatedTopicsDisplay', // New display area
  // Add other frequently used DOM IDs
} as const;

// Audio Recorder Settings
export const AUDIO_RECORDER_CONFIG = {
  LANG: 'en-US',
  MIME_TYPE: 'audio/webm;codecs=opus',
  TIMESLICE_INTERVAL: 1000, // Interval for mediaRecorder.ondataavailable
  RECOGNITION_RESTART_DELAY: 100, // ms, delay before restarting speech recognition onend
  DURATION_UPDATE_INTERVAL: 100, // ms, interval for updating recording duration display
} as const;

// ChartManager Specific Values (can be merged with APP_CONFIG.CHART or kept separate for clarity)
export const CHART_DEFAULTS = {
  SENTIMENT_CHART_COLORS: ['#4CAF50', '#FFC107', '#F44336'],
  SENTIMENT_CHART_BORDER_COLORS: ['#388E3C', '#F57C00', '#D32F2F'], // Example, consider if COLORS.chartBorders is sufficient
  SENTIMENT_CHART_CUTOUT: '50%',
  DEFAULT_FONT_SIZE: 16,
  DEFAULT_FONT_STYLE: 'bold', // Assuming 'bold' is common, could be more granular
} as const;

// Utility-specific constants
export const UTIL_CONFIG = {
  LOGGER_MAX_HISTORY: 1000, // Max log entries for LoggerService history
  NETWORK_ERROR_PATTERNS: ['network', 'timeout', 'fetch', 'connection', 'cors', 'offline'],
} as const;

// Chart related constants
export const CHART_TYPES = {
  TOPICS: 'topics',
  SENTIMENT: 'sentiment',
  WORD_FREQUENCY: 'wordFrequency',
  ALL: 'all', // Represents a request for all chart types
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
  },
  
  API: {
    API_KEY_MISSING: 'API key is missing. Please configure your Gemini API key.',
    CONNECTION_FAILED: 'Failed to connect to API. Please check your internet connection.',
    RATE_LIMITED: 'API rate limit exceeded. Please try again later.',
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
