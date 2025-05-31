import { AudioTranscriptionApp } from './AudioTranscriptionApp';
import { APIService } from '../services/APIService';
import { AudioRecorder } from '../services/AudioRecorder';
import { ChartManager } from '../services/ChartManager';
import { DataProcessor } from '../services/DataProcessor';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import { IntervalManager } from '../services/IntervalManager';
import { BundleOptimizer } from '../services/BundleOptimizer';
import { ProductionMonitor } from '../services/ProductionMonitor';
import { HealthCheckService } from '../services/HealthCheckService';
import { ErrorHandler, MemoryManager } from '../utils';

// --- Mocking Services ---
let mockSharedAPIServiceInstance: jest.Mocked<APIService>;
let mockSharedAudioRecorderInstance: jest.Mocked<AudioRecorder>;
let mockSharedChartManagerInstance: jest.Mocked<ChartManager>;

jest.mock('../services/APIService', () => ({ APIService: jest.fn(() => mockSharedAPIServiceInstance) }));
jest.mock('../services/AudioRecorder', () => ({ AudioRecorder: jest.fn(() => mockSharedAudioRecorderInstance) }));
jest.mock('../services/ChartManager', () => ({ ChartManager: jest.fn(() => mockSharedChartManagerInstance) }));
jest.mock('../services/PerformanceMonitor');
jest.mock('../services/IntervalManager');
jest.mock('../services/BundleOptimizer');
jest.mock('../services/ProductionMonitor');
jest.mock('../services/HealthCheckService');
jest.mock('../services/DataProcessor');
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  ErrorHandler: { logError: jest.fn() },
  MemoryManager: { getInstance: jest.fn(), cleanup: jest.fn() },
}));

// --- Mocking DOM and localStorage ---
let getElementByIdMock: jest.Mock;
let querySelectorMock: jest.Mock; // For document.querySelector
let appendChildSpy: jest.Mock; // For document.body.appendChild

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    length: 0, key: jest.fn(),
  };
})();

// Declare globally scoped mock DOM elements that need to be referenced across beforeEach and tests
let mockThemeToggleButton: HTMLButtonElement;
let mockThemeIcon: HTMLElement;

describe('AudioTranscriptionApp Unit Tests - Core Setup', () => {
  let app: AudioTranscriptionApp;
  let container: HTMLElement;

  let MockedAPIService: jest.Mocked<APIService>;
  let MockedAudioRecorder: jest.Mocked<AudioRecorder>;
  let MockedChartManager: jest.Mocked<ChartManager>;
  let MockedPerformanceMonitor: jest.Mocked<PerformanceMonitor>;
  let MockedIntervalManager: jest.Mocked<IntervalManager>;
  let MockedBundleOptimizer: jest.Mocked<BundleOptimizer>;
  let MockedProductionMonitor: jest.Mocked<ProductionMonitor>;
  let MockedHealthCheckService: jest.Mocked<HealthCheckService>;
  let MockedMemoryManager: jest.Mocked<MemoryManager>;

  // Declare other DOM elements here if they also need shared reference and specific method spies
  let mockRecordButton: HTMLButtonElement;
  let mockTranscriptionArea: HTMLTextAreaElement;
  let mockPolishedNoteArea: HTMLDivElement;
  let mockStatusDisplay: HTMLDivElement;
  let mockApiKeyInput: HTMLInputElement;
  let mockRememberApiKeyCheckbox: HTMLInputElement;
  let mockSettingsButton: HTMLButtonElement;


  beforeEach(() => {
    // Instantiate shared service instances
    const ActualAPIServiceManualMock = jest.requireActual('../services/__mocks__/APIService').APIService;
    mockSharedAPIServiceInstance = new ActualAPIServiceManualMock() as jest.Mocked<APIService>;
    // Explicitly make methods jest.fn()
    mockSharedAPIServiceInstance.hasValidApiKey = jest.fn();
    mockSharedAPIServiceInstance.testConnection = jest.fn();
    mockSharedAPIServiceInstance.polishTranscription = jest.fn();
    mockSharedAPIServiceInstance.generateChartData = jest.fn();
    mockSharedAPIServiceInstance.generateSampleChartData = jest.fn();
    mockSharedAPIServiceInstance.setApiKey = jest.fn();
    MockedAPIService = mockSharedAPIServiceInstance;

    const ActualAudioRecorderClass = jest.requireActual('../services/AudioRecorder').AudioRecorder;
    mockSharedAudioRecorderInstance = new ActualAudioRecorderClass() as jest.Mocked<AudioRecorder>;
    // Explicitly make methods jest.fn()
    mockSharedAudioRecorderInstance.isSupported = jest.fn();
    mockSharedAudioRecorderInstance.getIsRecording = jest.fn();
    mockSharedAudioRecorderInstance.startRecording = jest.fn();
    mockSharedAudioRecorderInstance.stopRecording = jest.fn();
    mockSharedAudioRecorderInstance.onTranscriptAvailable = jest.fn();
    mockSharedAudioRecorderInstance.onRecordingStateChange = jest.fn();
    mockSharedAudioRecorderInstance.formatDuration = jest.fn();
    mockSharedAudioRecorderInstance.cleanup = jest.fn();
    MockedAudioRecorder = mockSharedAudioRecorderInstance;

    const ActualChartManagerClass = jest.requireActual('../services/ChartManager').ChartManager;
    mockSharedChartManagerInstance = new ActualChartManagerClass() as jest.Mocked<ChartManager>;
    // Explicitly make methods jest.fn()
    mockSharedChartManagerInstance.createChart = jest.fn();
    mockSharedChartManagerInstance.destroyAllCharts = jest.fn();
    mockSharedChartManagerInstance.resizeAllCharts = jest.fn();
    MockedChartManager = mockSharedChartManagerInstance;

    // Create mock objects for singletons
    MockedPerformanceMonitor = { startMonitoring: jest.fn(), measureOperation: jest.fn((fn: () => any) => fn()), getLatestMetrics: jest.fn(), getAlerts: jest.fn(), cleanup: jest.fn(), getRecentOperations: jest.fn().mockReturnValue([]), } as jest.Mocked<PerformanceMonitor>;
    MockedIntervalManager = { createRecurringTask: jest.fn(), clearInterval: jest.fn(), clearTimeout: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<IntervalManager>;
    MockedBundleOptimizer = { registerLazyModule: jest.fn(), loadCriticalModules: jest.fn(), cleanup: jest.fn(), loadLazyModule: jest.fn(), } as jest.Mocked<BundleOptimizer>;
    MockedProductionMonitor = { trackEvent: jest.fn(), trackError: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<ProductionMonitor>;
    MockedHealthCheckService = { getHealthStatus: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<HealthCheckService>;
    MockedMemoryManager = { trackInterval: jest.fn(), clearInterval: jest.fn(), clearTimeout: jest.fn(), getStats: jest.fn().mockReturnValue({ intervals: 0, timeouts: 0, eventListeners: 0 }), cleanup: jest.fn(), } as jest.Mocked<MemoryManager>;

    // Configure singleton getInstance mocks
    (PerformanceMonitor.getInstance as jest.Mock).mockReturnValue(MockedPerformanceMonitor);
    (IntervalManager.getInstance as jest.Mock).mockReturnValue(MockedIntervalManager);
    (BundleOptimizer.getInstance as jest.Mock).mockReturnValue(MockedBundleOptimizer);
    (ProductionMonitor.getInstance as jest.Mock).mockReturnValue(MockedProductionMonitor);
    (HealthCheckService.getInstance as jest.Mock).mockReturnValue(MockedHealthCheckService);
    (MemoryManager.getInstance as jest.Mock).mockReturnValue(MockedMemoryManager);

    // Reset all mocks (jest.clearAllMocks clears call history, .mockReset clears implementation and history)
    jest.clearAllMocks();
    Object.values(MockedAPIService).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedAudioRecorder).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedChartManager).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedPerformanceMonitor).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedIntervalManager).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedBundleOptimizer).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedProductionMonitor).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedHealthCheckService).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    Object.values(MockedMemoryManager).forEach(m => typeof m?.mockReset === 'function' && m.mockReset());
    (DataProcessor.getAllNotes as jest.Mock).mockReset(); (DataProcessor.saveNote as jest.Mock).mockReset(); (DataProcessor.deleteNote as jest.Mock).mockReset(); (DataProcessor.exportNotes as jest.Mock).mockReset();
    (ErrorHandler.logError as jest.Mock).mockReset();
    localStorageMock.clear();

    // Initialize DOM element mocks for each test
    mockRecordButton = document.createElement('button'); mockRecordButton.id = 'recordButton';
    mockTranscriptionArea = document.createElement('textarea'); mockTranscriptionArea.id = 'rawTranscription';
    mockPolishedNoteArea = document.createElement('div'); mockPolishedNoteArea.id = 'polishedNote';
    mockStatusDisplay = document.createElement('div'); mockStatusDisplay.id = 'recordingStatus';
    mockApiKeyInput = document.createElement('input'); mockApiKeyInput.id = 'apiKeyInput';
    mockRememberApiKeyCheckbox = document.createElement('input'); mockRememberApiKeyCheckbox.id = 'rememberApiKey'; mockRememberApiKeyCheckbox.type = 'checkbox';
    mockSettingsButton = document.createElement('button'); mockSettingsButton.id = 'settingsButton';
    mockThemeToggleButton = document.createElement('button'); mockThemeToggleButton.id = 'themeToggleButton';
    mockThemeIcon = document.createElement('i');
    jest.spyOn(mockThemeToggleButton, 'querySelector').mockImplementation((selector: string) => selector === 'i' ? mockThemeIcon : null);

    getElementByIdMock = jest.fn((id: string) => {
      switch (id) {
        case 'recordButton': return mockRecordButton;
        case 'rawTranscription': return mockTranscriptionArea;
        case 'polishedNote': return mockPolishedNoteArea;
        case 'recordingStatus': return mockStatusDisplay;
        case 'settingsButton': return mockSettingsButton;
        case 'themeToggleButton': return mockThemeToggleButton;
        case 'apiKeyInput': return mockApiKeyInput;
        case 'rememberApiKey': return mockRememberApiKeyCheckbox;
        default: return document.createElement('div');
      }
    });
    querySelectorMock = jest.fn().mockImplementation((selector: string) => {
      if (selector === '[data-tab="note"]') { const el = document.createElement('button'); el.dataset.tab = 'note'; return el; }
      // Add other document.querySelector mocks if needed by initTheme or other unmocked methods
      return document.createElement('div');
    });
    appendChildSpy = jest.fn();
    Object.defineProperty(document, 'getElementById', { value: getElementByIdMock, configurable: true });
    Object.defineProperty(document, 'querySelector', { value: querySelectorMock, configurable: true });
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(), }))});

    // Set default behaviors for critical methods AFTER reset and instance creation
    MockedAPIService.hasValidApiKey.mockReturnValue(true);
    MockedAPIService.testConnection.mockResolvedValue({ success: true });
    MockedAudioRecorder.isSupported.mockReturnValue(true);
    MockedAudioRecorder.getIsRecording.mockReturnValue(false);
    MockedHealthCheckService.getHealthStatus.mockResolvedValue({ status: 'healthy', checks: {} });
    MockedBundleOptimizer.loadCriticalModules.mockResolvedValue(undefined);
    (DataProcessor.getAllNotes as jest.Mock).mockReturnValue([]);
    MockedPerformanceMonitor.measureOperation.mockImplementation((fn: () => any) => { const res = fn(); return (res && typeof res.then === 'function') ? res : Promise.resolve(res); });
    MockedPerformanceMonitor.getRecentOperations.mockReturnValue([]);
    MockedIntervalManager.createRecurringTask.mockReturnValue(1); // ensure it returns a number

    container = document.createElement('div');
    container.appendChild(mockRecordButton); container.appendChild(mockTranscriptionArea); container.appendChild(mockPolishedNoteArea); container.appendChild(mockStatusDisplay); container.appendChild(mockApiKeyInput); container.appendChild(mockRememberApiKeyCheckbox);

    app = new AudioTranscriptionApp(container);

    // Spy on setupEventListeners, but allow initTheme to run
    jest.spyOn(app as any, 'setupEventListeners').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization (init method)', () => {
    it('should call key setup and service methods on init (and setup DOM references)', async () => {
      const setupDOMReferencesSpy = jest.spyOn(app as any, 'setupDOMReferences');
      const initThemeSpy = jest.spyOn(app as any, 'initTheme'); // Spy on actual initTheme

      await app.init();

      expect(setupDOMReferencesSpy).toHaveBeenCalled();
      expect(initThemeSpy).toHaveBeenCalled();
      expect(MockedPerformanceMonitor.startMonitoring).toHaveBeenCalled();
      expect(MockedHealthCheckService.getHealthStatus).toHaveBeenCalled();
      expect(MockedBundleOptimizer.loadCriticalModules).toHaveBeenCalled();
      expect(MockedAudioRecorder.onRecordingStateChange).toHaveBeenCalled();
      expect(MockedAudioRecorder.onTranscriptAvailable).toHaveBeenCalled();
      expect(DataProcessor.getAllNotes).toHaveBeenCalled();
      expect(MockedIntervalManager.createRecurringTask).toHaveBeenCalledTimes(2);
      expect(MockedAPIService.testConnection).toHaveBeenCalled();

      setupDOMReferencesSpy.mockRestore();
      initThemeSpy.mockRestore();
    });

    it('should correctly find or create essential DOM elements', async () => {
      const containerQuerySelectorSpy = jest.spyOn(container, 'querySelector');
      const setupDOMReferencesSpy = jest.spyOn(app as any, 'setupDOMReferences'); // Allow original to run

      await app.init();

      expect(setupDOMReferencesSpy).toHaveBeenCalled();
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#recordButton');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#rawTranscription');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#polishedNote');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#recordingStatus');

      setupDOMReferencesSpy.mockRestore();
      containerQuerySelectorSpy.mockRestore();
    });

    it('should initialize API key from localStorage if present and update input', async () => {
      localStorageMock.setItem('geminiApiKey', 'test-api-key-localstorage');
      await app.init();
      expect(MockedAPIService.setApiKey).toHaveBeenCalledWith('test-api-key-localstorage');
      expect(mockApiKeyInput.value).toBe('test-api-key-localstorage');
      expect(mockRememberApiKeyCheckbox.checked).toBe(true);
    });

    it('should call onRecordingStateChange and onTranscriptAvailable for AudioRecorder setup', async () => {
      await app.init();
      expect(MockedAudioRecorder.onRecordingStateChange).toHaveBeenCalled();
      expect(MockedAudioRecorder.onTranscriptAvailable).toHaveBeenCalled();
    });
  });

  describe('Theme Initialization', () => {
    beforeEach(() => {
      document.body.className = '';
      // mockThemeToggleButton and mockThemeIcon are defined and spied on in the main beforeEach
      // Re-spy on initTheme for app to ensure it's called if app instance is reset or init called multiple times
      // However, app is created fresh in main beforeEach, so initTheme will be the real one.
    });

    it('should apply dark theme by default if no theme is in localStorage', async () => {
      localStorageMock.clear();
      const initThemeSpy = jest.spyOn(app as any, 'initTheme'); // Spy on actual
      await app.init();
      expect(document.body.classList.contains('light-mode')).toBe(false);
      expect(mockThemeIcon.className).toBe('fas fa-sun');
      initThemeSpy.mockRestore();
    });

    it('should apply light theme if "light" is saved in localStorage', async () => {
      localStorageMock.setItem('voice-notes-theme', 'light');
      const initThemeSpy = jest.spyOn(app as any, 'initTheme');
      await app.init();
      expect(document.body.classList.contains('light-mode')).toBe(true);
      expect(mockThemeIcon.className).toBe('fas fa-moon');
      initThemeSpy.mockRestore();
    });

    it('should apply dark theme if "dark" is saved in localStorage', async () => {
      localStorageMock.setItem('voice-notes-theme', 'dark');
      const initThemeSpy = jest.spyOn(app as any, 'initTheme');
      await app.init();
      expect(document.body.classList.contains('light-mode')).toBe(false);
      expect(mockThemeIcon.className).toBe('fas fa-sun');
      initThemeSpy.mockRestore();
    });
  });
});
