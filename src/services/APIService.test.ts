import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APIService } from './APIService';
import { ERROR_MESSAGES } from '../constants';
import { ErrorHandler } from '../utils';

// Define the mock functions that will be part of the GoogleGenAI instance's behavior
const mockGenerateContentResponseText = vi.fn();
const mockGenerateContent = vi.fn(() => Promise.resolve({
  response: { text: mockGenerateContentResponseText }
}));
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

// Mock the @google/genai module
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const MockGoogleGenAI_InFactory = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  return {
    ...actual,
    GoogleGenAI: MockGoogleGenAI_InFactory,
  };
});

let MockedGoogleGenAIConstructor: ReturnType<typeof vi.fn>;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {});

describe('APIService', () => {
  let apiService: APIService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;


  const VALID_API_KEY = 'valid_api_key_1234567890';
  const INVALID_SHORT_KEY = 'short';
  const ENV_API_KEY = 'env_key_1234567890';

  beforeEach(async () => {
    const { GoogleGenAI } = await import('@google/genai');
    MockedGoogleGenAIConstructor = vi.mocked(GoogleGenAI);

    mockGenerateContentResponseText.mockReset();
    mockGenerateContent.mockReset().mockImplementation(() => Promise.resolve({
      response: { text: mockGenerateContentResponseText }
    }));
    mockGetGenerativeModel.mockReset().mockImplementation(() => ({
      generateContent: mockGenerateContent,
    }));
    MockedGoogleGenAIConstructor.mockClear();
    MockedGoogleGenAIConstructor.mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    localStorageMock.clear();
    vi.unstubAllEnvs();

    // Restore spies before re-assigning, important if a test doesn't clean up its local spy
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ErrorHandler.logError.mockClear();
  });

  afterEach(() => {
     consoleLogSpy?.mockRestore();
     consoleErrorSpy?.mockRestore();
  });

  describe('Constructor & initializeAPI', () => {
    it('should initialize with VITE_GEMINI_API_KEY from env if set', () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', VALID_API_KEY);
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('API service initialized with API key'));
    });

    it('should initialize with geminiApiKey from localStorage if env var is not set', () => {
      localStorageMock.setItem('geminiApiKey', VALID_API_KEY);
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('API service initialized with API key'));
    });

    it('should prioritize localStorage over env var if APIService code does that', () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', ENV_API_KEY);
      localStorageMock.setItem('geminiApiKey', VALID_API_KEY);
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
    });

    it('should not initialize GoogleGenAI if neither env var nor localStorage key is present', () => {
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith("ℹ️ No API key found - API service ready for key configuration");
    });

    it('should not initialize GoogleGenAI with an invalid/short API key from env', () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', INVALID_SHORT_KEY);
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith("ℹ️ API key is invalid (e.g., too short) - API service ready for valid key configuration");
    });

    it('should not initialize GoogleGenAI with an invalid/short API key from localStorage', () => {
      localStorageMock.setItem('geminiApiKey', INVALID_SHORT_KEY);
      apiService = new APIService();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
    });

    it('should call console.error with "API Key is null..." if constructor error leads to null API key state', () => {
      const constructorErrorMessage = "Custom GenAI constructor error";
      const testApiKey = 'valid_long_enough_key_for_this_test';
      vi.stubEnv('VITE_GEMINI_API_KEY', testApiKey);

      MockedGoogleGenAIConstructor.mockImplementationOnce(() => {
        throw new Error(constructorErrorMessage);
      });

      // Spy on console.error specifically for this test
      const localConsoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      apiService = new APIService();

      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(testApiKey);
      expect(apiService.hasValidApiKey()).toBe(false);

      // Check for the actual error message logged when GoogleGenAI constructor fails
      expect(localConsoleErrorSpy).toHaveBeenCalledWith("Error initializing GoogleGenAI:", constructorErrorMessage);

      localConsoleErrorSpy.mockRestore();
    });
  });

  describe('setApiKey', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
      localStorageMock.clear();
      apiService = new APIService();
      MockedGoogleGenAIConstructor.mockClear();
    });

    it('should set API key, save to localStorage, and initialize GoogleGenAI', () => {
      apiService.setApiKey(VALID_API_KEY);
      expect(localStorageMock.getItem('geminiApiKey')).toBe(VALID_API_KEY);
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('API key set and service initialized successfully'));
    });

    it('should not set API key or initialize if key is invalid/short', () => {
      apiService.setApiKey(INVALID_SHORT_KEY);
      expect(localStorageMock.getItem('geminiApiKey')).toBeNull();
      expect(MockedGoogleGenAIConstructor).not.toHaveBeenCalled();
      expect(apiService.hasValidApiKey()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid API key provided'));
    });
     it('should trim whitespace from API key', () => {
      const keyWithWhitespace = `  ${VALID_API_KEY}  `;
      apiService.setApiKey(keyWithWhitespace);
      expect(localStorageMock.getItem('geminiApiKey')).toBe(VALID_API_KEY);
      expect(MockedGoogleGenAIConstructor).toHaveBeenCalledWith(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
    });
  });

  describe('hasValidApiKey', () => {
    it('should return true if API key is set and GoogleGenAI initialized', () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      expect(apiService.hasValidApiKey()).toBe(true);
    });

    it('should return false if API key is not set', () => {
      apiService = new APIService();
      expect(apiService.hasValidApiKey()).toBe(false);
    });
     it('should return false if GoogleGenAI failed to initialize even with a key attempt', () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'key_that_will_fail_genai_init');
      MockedGoogleGenAIConstructor.mockImplementationOnce(() => { throw new Error("GenAI lib error"); });
      apiService = new APIService();
      expect(apiService.hasValidApiKey()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success if API call is successful', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce('Test content');
      const result = await apiService.testConnection();
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: expect.any(String) });
      expect(mockGenerateContent).toHaveBeenCalledWith('Test connection');
      expect(result).toEqual({ success: true, data: true });
    });

    it('should return error if API call fails', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));
      const result = await apiService.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('API connection failed: Network error');
    });

    it('should return error if API key is missing', async () => {
      apiService = new APIService();
      const result = await apiService.testConnection();
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.API.API_KEY_MISSING });
    });
  });

  describe('polishTranscription', () => {
    const rawText = 'this is a raw text';
    const polishedText = 'This is a polished text.';

    it('should return polished text on success', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce(polishedText);
      const result = await apiService.polishTranscription(rawText);
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining(rawText));
      expect(result).toEqual({ success: true, data: polishedText });
    });

    it('should return error if API call fails', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContent.mockRejectedValueOnce(new Error('Polish API error'));
      const result = await apiService.polishTranscription(rawText);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to polish transcription: Polish API error');
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it('should return an error object if API key is missing', async () => {
      apiService = new APIService();
      const result = await apiService.polishTranscription(rawText);
      expect(result).toEqual({
        success: false,
        error: `Failed to polish transcription: ${ERROR_MESSAGES.API.API_KEY_MISSING}`
      });
    });
  });

  describe('generateChartData', () => {
    const transcription = 'Sample transcription for chart data.';
    const mockChartDataObject = { some: 'data' };

    it('should return chart data for "topics" type on success', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce(JSON.stringify(mockChartDataObject));
      const result = await apiService.generateChartData(transcription, 'topics');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining(transcription));
      expect(result).toEqual({ success: true, data: mockChartDataObject });
    });

    it('should return chart data for "sentiment" type on success', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce(JSON.stringify(mockChartDataObject));
      const result = await apiService.generateChartData(transcription, 'sentiment');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining(transcription));
      expect(result).toEqual({ success: true, data: mockChartDataObject });
    });

    it('should return chart data for "wordFrequency" type on success', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce(JSON.stringify(mockChartDataObject));
      const result = await apiService.generateChartData(transcription, 'wordFrequency');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining(transcription));
      expect(result).toEqual({ success: true, data: mockChartDataObject });
    });

    it('should return an error object for unknown chart type', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      const result = await apiService.generateChartData(transcription, 'unknownType');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown chart type: unknownType');
    });

    it('should return error if API call fails', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContent.mockRejectedValueOnce(new Error('Chart API error'));
      const result = await apiService.generateChartData(transcription, 'topics');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate chart data: Chart API error');
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it('should return error if JSON parsing fails', async () => {
      apiService = new APIService();
      apiService.setApiKey(VALID_API_KEY);
      mockGenerateContentResponseText.mockReturnValueOnce("not a valid json");
      const result = await apiService.generateChartData(transcription, 'topics');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate chart data: Unexpected token');
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it('should return an error object if API key is missing', async () => {
      apiService = new APIService();
      const result = await apiService.generateChartData(transcription, 'topics');
      expect(result).toEqual({
        success: false,
        error: `Failed to generate chart data: ${ERROR_MESSAGES.API.API_KEY_MISSING}`
      });
    });
  });
});
