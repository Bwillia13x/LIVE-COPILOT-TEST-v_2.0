/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    APP_CONFIG as DEFAULT_APP_CONFIG,
    API_CONFIG as DEFAULT_API_CONFIG,
    AUDIO_RECORDER_CONFIG as DEFAULT_AUDIO_RECORDER_CONFIG,
    UTIL_CONFIG as DEFAULT_UTIL_CONFIG,
    STORAGE_KEYS, // Will be used by services, not directly part of AppConfig values
    CHART_DEFAULTS, // May or may not be part of AppConfig directly
    ERROR_MESSAGES
} from '../constants.js';

// Re-exporting some constants for direct use if preferred by modules,
// or they can be accessed via AppConfig getters.
export { STORAGE_KEYS, CHART_DEFAULTS, ERROR_MESSAGES };

// Define specific configuration types based on imported defaults
type RetryConfig = typeof DEFAULT_APP_CONFIG.RETRY;
type TimingConfig = typeof DEFAULT_APP_CONFIG.TIMING;
type AudioRecorderConfig = typeof DEFAULT_AUDIO_RECORDER_CONFIG;
type LoggerConfig = { MAX_HISTORY: number }; // From UTIL_CONFIG

/**
 * Centralized Application Configuration Manager.
 * Provides access to environment variables and default configurations.
 */
export class AppConfig {
  private static getEnvVariable(key: string): string | undefined {
    return import.meta.env[key] as string | undefined;
  }

  /**
   * Retrieves the Gemini API Key.
   * Priority: Environment Variable (VITE_GEMINI_API_KEY).
   * Logs a warning if the API key is not found or appears invalid.
   * Note: APIService will still handle localStorage override.
   */
  public static getGeminiApiKey(): string | null {
    const envApiKey = AppConfig.getEnvVariable('VITE_GEMINI_API_KEY');
    if (envApiKey && envApiKey.trim() && envApiKey.length > 10) {
      return envApiKey.trim();
    }
    // No default API key should be hardcoded here for security.
    // APIService will handle the case where no key is found (from env or localStorage).
    console.warn(
      ERROR_MESSAGES.API.API_KEY_MISSING +
      " Ensure VITE_GEMINI_API_KEY is set in your environment if not using localStorage."
    );
    return null;
  }

  /**
   * Retrieves the default Gemini model name.
   */
  public static getDefaultModelName(): string {
    return DEFAULT_API_CONFIG.GEMINI.DEFAULT_MODEL_NAME || 'gemini-1.0-pro'; // Fallback just in case
  }

  /**
   * Retrieves retry configuration for API calls.
   */
  public static getRetryConfig(): RetryConfig {
    return DEFAULT_APP_CONFIG.RETRY;
  }

  /**
   * Retrieves general timing configurations.
   */
  public static getTimingConfig(): TimingConfig {
    return DEFAULT_APP_CONFIG.TIMING;
  }

  /**
   * Retrieves audio recorder configurations.
   */
  public static getAudioRecorderConfig(): AudioRecorderConfig {
    return DEFAULT_AUDIO_RECORDER_CONFIG;
  }

  /**
   * Retrieves logger configurations.
   */
  public static getLoggerConfig(): LoggerConfig {
      return {
          MAX_HISTORY: DEFAULT_UTIL_CONFIG.LOGGER_MAX_HISTORY
      };
  }

  /**
   * Retrieves performance related configurations (subset from APP_CONFIG.PERFORMANCE)
   */
  public static getPerformanceConfig() {
    return {
        CLEANUP_INTERVAL: DEFAULT_APP_CONFIG.PERFORMANCE.CLEANUP_INTERVAL,
        MAX_MEMORY_USAGE: DEFAULT_APP_CONFIG.PERFORMANCE.MAX_MEMORY_USAGE,
        // Add other performance configs if needed by services directly
    };
  }
}

// Example of basic validation during module load (optional)
// (() => {
//   const key = AppConfig.getGeminiApiKey();
//   if (!key) {
//     console.warn("AppConfig: Gemini API Key is not configured via environment variables.");
//   }
// })();
