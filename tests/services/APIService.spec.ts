import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import APIService AFTER vi.mock calls have been processed
import { API_CONFIG, APP_CONFIG, STORAGE_KEYS, ERROR_MESSAGES } from '../../src/constants';
import type { APIResponse } from '../../src/types';

// --- Mocking Section ---
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));
const mockGoogleGenAIConstructorInner = vi.fn(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAIConstructorInner,
}));

const mockGetGeminiApiKey = vi.fn();
const mockGetDefaultModelName = vi.fn();
vi.mock('../../src/config/AppConfig', () => ({
  AppConfig: {
    getGeminiApiKey: mockGetGeminiApiKey,
    getDefaultModelName: mockGetDefaultModelName,
  },
}));

const mockErrorHandlerLogError = vi.fn();
const mockErrorHandlerLogWarning = vi.fn();
vi.mock('../../src/utils', async (importOriginal) => {
  const actualUtils = await importOriginal() as any;
  return {
    ...actualUtils,
    ErrorHandler: {
      getInstance: vi.fn(() => ({})),
      logError: mockErrorHandlerLogError,
      logWarning: mockErrorHandlerLogWarning,
    },
  };
});


// --- Test Suite ---
describe('APIService', () => {
  const mockApiKey = 'test_api_key_valid_length_for_testing_purpose';
  let APIServiceActual: typeof import('../../src/services/APIService').APIService;
  let apiService: InstanceType<typeof APIServiceActual>;
  let MockedGoogleGenAIConstructor: ReturnType<typeof vi.fn>;

  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();

    const serviceModule = await import('../../src/services/APIService');
    APIServiceActual = serviceModule.APIService;

    const GAI = await import('@google/genai');
    MockedGoogleGenAIConstructor = GAI.GoogleGenAI as ReturnType<typeof vi.fn>;

    MockedGoogleGenAIConstructor.mockClear();
    mockGetGenerativeModel.mockClear();
    mockGenerateContent.mockClear();
    mockGetGeminiApiKey.mockClear();
    mockGetDefaultModelName.mockClear();
    mockErrorHandlerLogError.mockClear();
    mockErrorHandlerLogWarning.mockClear();

    mockGetGeminiApiKey.mockReturnValue(null);
    mockGetDefaultModelName.mockReturnValue(API_CONFIG.DEFAULT_MODEL_NAME);

    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization (initializeAPI)', () => {
    it('should initialize with API key from localStorage if available and valid', () => {
      getItemSpy.mockReturnValue(mockApiKey);
      mockGetGeminiApiKey.mockReturnValue(null);
      apiService = new APIServiceActual();
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY);
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(mockApiKey);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔑 API service initialized with API key');
    });

    it('should initialize with API key from AppConfig (env var) if localStorage key is not available', () => {
      getItemSpy.mockReturnValue(null);
      mockGetGeminiApiKey.mockReturnValue(mockApiKey);
      apiService = new APIServiceActual();
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY);
      expect(mockGetGeminiApiKey).toHaveBeenCalled();
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(mockApiKey);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔑 API service initialized with API key');
    });

    it('should prioritize localStorage API key over AppConfig (env var) key', () => {
      const localStorageKey = 'local_storage_key_valid_length_123';
      getItemSpy.mockReturnValue(localStorageKey);
      mockGetGeminiApiKey.mockReturnValue(mockApiKey);
      apiService = new APIServiceActual();
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(localStorageKey);
      expect(apiService.hasValidApiKey()).toBe(true);
    });

    it('should handle initialization with an invalid (short) API key from localStorage', () => {
      const shortKey = 'short';
      getItemSpy.mockReturnValue(shortKey);
      mockGetGeminiApiKey.mockReturnValue(null);
      apiService = new APIServiceActual();

      expect(mockErrorHandlerLogWarning).toHaveBeenCalledWith(
        expect.stringContaining('An API key was found but it is invalid (too short). Service not initialized.'),
        'APIService.initializeAPI'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️ No valid API key available - API service ready for key configuration');
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
    });

    it('should handle initialization with an invalid (short) API key from AppConfig if no localStorage key', () => {
      const shortEnvKey = 'shortkey';
      getItemSpy.mockReturnValue(null);
      mockGetGeminiApiKey.mockReturnValue(shortEnvKey);

      apiService = new APIServiceActual();

      expect(mockGetGeminiApiKey).toHaveBeenCalled();
      expect(mockErrorHandlerLogWarning).toHaveBeenCalledWith(
        expect.stringContaining('An API key was found but it is invalid (too short). Service not initialized.'),
        'APIService.initializeAPI'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️ No valid API key available - API service ready for key configuration');
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
    });

    it('should initialize with no API key if none is available from localStorage or AppConfig (AppConfig returns null)', () => {
      getItemSpy.mockReturnValue(null);
      mockGetGeminiApiKey.mockReturnValue(null);

      apiService = new APIServiceActual();

      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️ No valid API key available - API service ready for key configuration');
      expect(mockErrorHandlerLogWarning).not.toHaveBeenCalledWith(expect.stringContaining('An API key was found but it is invalid'), expect.any(String));
    });

    it('hasValidApiKey() should return false if GoogleGenAI instantiation fails', () => {
      getItemSpy.mockReturnValue(mockApiKey);
      MockedGoogleGenAIConstructor.mockImplementationOnce(() => {
        throw new Error('Test GenAI instantiation error');
      });
      apiService = new APIServiceActual();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        'Failed to initialize GoogleGenAI during API setup',
        expect.any(Error)
      );
      const errorArg = mockErrorHandlerLogError.mock.calls[0][1] as Error;
      expect(errorArg.message).toBe('Test GenAI instantiation error');
    });
  });

  // Tests for setApiKey
  describe('setApiKey', () => {
    beforeEach(() => {
      // Start with a clean APIService (no key) for setApiKey tests
      getItemSpy.mockReturnValue(null);
      mockGetGeminiApiKey.mockReturnValue(null);
      apiService = new APIServiceActual();
      // Clear mocks that might have been called during the above APIService instantiation
      MockedGoogleGenAIConstructor.mockClear();
      setItemSpy.mockClear();
      mockErrorHandlerLogError.mockClear(); // ErrorHandler is mocked, not console.error directly from APIService.setApiKey
      mockErrorHandlerLogWarning.mockClear();
      consoleLogSpy.mockClear(); // For the success message
    });

    it('should update localStorage and initialize GoogleGenAI with a valid API key', () => {
      const validNewKey = 'new_valid_api_key_for_testing_setapikey';
      apiService.setApiKey(validNewKey);

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY, validNewKey);
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(validNewKey);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔑 API key set and service initialized successfully');
    });

    it('should not update localStorage or initialize GoogleGenAI with an invalid (short) API key', () => {
      const invalidShortKey = 'short';
      apiService.setApiKey(invalidShortKey);

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(mockErrorHandlerLogWarning).toHaveBeenCalledWith('Invalid API key provided for setting.', 'setApiKey');
    });

    it('should not update localStorage or initialize GoogleGenAI with an empty API key', () => {
      apiService.setApiKey('');
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(mockErrorHandlerLogWarning).toHaveBeenCalledWith('Invalid API key provided for setting.', 'setApiKey');
    });

    it('should handle error if GoogleGenAI instantiation fails during setApiKey', () => {
      const validKey = 'valid_key_for_setapikey_failure_test';
      MockedGoogleGenAIConstructor.mockImplementationOnce(() => {
        throw new Error('Test GenAI instantiation error during setApiKey');
      });

      apiService.setApiKey(validKey);

      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY, validKey);
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(mockErrorHandlerLogError).toHaveBeenCalledWith(
        'Failed to set API key',
        expect.any(Error)
      );
      const errorArg = mockErrorHandlerLogError.mock.calls[0][1] as Error;
      expect(errorArg.message).toBe('Test GenAI instantiation error during setApiKey');
    });
  });

  // Placeholder for other public method tests
  it('placeholder test should be true', () => { // Kept one placeholder for now
    expect(true).toBe(true);
  });
});
