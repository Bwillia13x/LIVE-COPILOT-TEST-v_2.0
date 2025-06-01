import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppConfig } from '../../src/config/AppConfig';
import {
    APP_CONFIG as DEFAULT_APP_CONFIG,
    API_CONFIG as DEFAULT_API_CONFIG,
    AUDIO_RECORDER_CONFIG as DEFAULT_AUDIO_RECORDER_CONFIG,
    UTIL_CONFIG as DEFAULT_UTIL_CONFIG,
    ERROR_MESSAGES
} from '../../src/constants';

describe('AppConfig', () => {
  const originalImportMetaEnv = import.meta.env;

  beforeEach(() => {
    // Reset import.meta.env before each test
    vi.stubGlobal('import_meta', {
      env: { ...originalImportMetaEnv } // Start with a copy of original or an empty object
    });
    // Clear any potential mocks on console if they were set by other tests
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore original import.meta.env
    vi.stubGlobal('import_meta', originalImportMetaEnv);
    vi.restoreAllMocks();
  });

  describe('getGeminiApiKey', () => {
    it('should return API key from environment variable VITE_GEMINI_API_KEY if set and valid', () => {
      import.meta.env.VITE_GEMINI_API_KEY = 'env_api_key_1234567890';
      // AppConfig reads env dynamically, so no explicit re-init needed for static getters.
      expect(AppConfig.getGeminiApiKey()).toBe('env_api_key_1234567890');
    });

    it('should return null and warn if API key from env is too short', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      import.meta.env.VITE_GEMINI_API_KEY = 'short';
      expect(AppConfig.getGeminiApiKey()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.API.API_KEY_MISSING +
        " Ensure VITE_GEMINI_API_KEY is set in your environment if not using localStorage."
      );
      consoleWarnSpy.mockRestore();
    });

    it('should return null and warn if API key env var is not set', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      delete import.meta.env.VITE_GEMINI_API_KEY; // Ensure it's not set
      expect(AppConfig.getGeminiApiKey()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.API.API_KEY_MISSING +
        " Ensure VITE_GEMINI_API_KEY is set in your environment if not using localStorage."
      );
      consoleWarnSpy.mockRestore();
    });

    it('should return null and warn if API key env var is empty string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      import.meta.env.VITE_GEMINI_API_KEY = '';
      expect(AppConfig.getGeminiApiKey()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getDefaultModelName', () => {
    it('should return default model name from API_CONFIG constants', () => {
      // This getter doesn't use env vars, directly returns from constants
      expect(AppConfig.getDefaultModelName()).toBe(DEFAULT_API_CONFIG.DEFAULT_MODEL_NAME); // Corrected path
    });
  });

  describe('getRetryConfig', () => {
    it('should return retry config from APP_CONFIG constants', () => {
      expect(AppConfig.getRetryConfig()).toEqual(DEFAULT_APP_CONFIG.RETRY);
    });
  });

  describe('getTimingConfig', () => {
    it('should return timing config from APP_CONFIG constants', () => {
      expect(AppConfig.getTimingConfig()).toEqual(DEFAULT_APP_CONFIG.TIMING);
    });
  });

  describe('getAudioRecorderConfig', () => {
    it('should return audio recorder config from AUDIO_RECORDER_CONFIG constants', () => {
      expect(AppConfig.getAudioRecorderConfig()).toEqual(DEFAULT_AUDIO_RECORDER_CONFIG);
    });
  });

  describe('getLoggerConfig', () => {
    it('should return logger config from UTIL_CONFIG constants', () => {
      const expectedLoggerConfig = {
        MAX_HISTORY: DEFAULT_UTIL_CONFIG.LOGGER_MAX_HISTORY
      };
      expect(AppConfig.getLoggerConfig()).toEqual(expectedLoggerConfig);
    });
  });

  describe('getPerformanceConfig', () => {
    it('should return specific performance configs from APP_CONFIG.PERFORMANCE constants', () => {
      const expectedPerfConfig = {
        CLEANUP_INTERVAL: DEFAULT_APP_CONFIG.PERFORMANCE.CLEANUP_INTERVAL,
        MAX_MEMORY_USAGE: DEFAULT_APP_CONFIG.PERFORMANCE.MAX_MEMORY_USAGE,
      };
      expect(AppConfig.getPerformanceConfig()).toEqual(expectedPerfConfig);
    });
  });

  // Test for the static getEnvVariable method (optional, as it's private, but good for completeness if made public/testable)
  // describe('_getEnvVariable (if it were public/testable)', () => {
  //   it('should retrieve an existing environment variable', () => {
  //     import.meta.env.MY_TEST_VARIABLE = 'test_value';
  //     expect(AppConfig.getEnvVariable('MY_TEST_VARIABLE')).toBe('test_value');
  //   });

  //   it('should return undefined for a non-existing environment variable', () => {
  //     expect(AppConfig.getEnvVariable('NON_EXISTING_VARIABLE')).toBeUndefined();
  //   });
  // });
});
