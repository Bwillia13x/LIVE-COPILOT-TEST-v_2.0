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
import { SettingsModal } from './SettingsModal';
import { ErrorHandler, MemoryManager } from '../utils';
import { fireEvent } from '@testing-library/dom';

// --- Mocking Services ---

// Declare module-scoped variables for shared instances using 'let'
let mockSharedAPIServiceInstance: jest.Mocked<APIService>;
let mockSharedAudioRecorderInstance: jest.Mocked<AudioRecorder>;
let mockSharedChartManagerInstance: jest.Mocked<ChartManager>;

// These factories will now refer to the above 'let' variables.
// Jest hoists jest.mock calls, but the factory functions themselves are closures
// that will capture these variables. The assignment happens in beforeEach.
jest.mock('../services/APIService', () => ({ APIService: jest.fn(() => mockSharedAPIServiceInstance) }));
jest.mock('../services/AudioRecorder', () => ({ AudioRecorder: jest.fn(() => mockSharedAudioRecorderInstance) }));
jest.mock('../services/ChartManager', () => ({ ChartManager: jest.fn(() => mockSharedChartManagerInstance) }));

// For singletons, mock their getInstance method.
jest.mock('../services/PerformanceMonitor');
jest.mock('../services/IntervalManager');
jest.mock('../services/BundleOptimizer');
jest.mock('../services/ProductionMonitor');
jest.mock('../services/HealthCheckService');
jest.mock('./SettingsModal');
jest.mock('../services/DataProcessor');
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  ErrorHandler: { logError: jest.fn() },
  MemoryManager: { getInstance: jest.fn(), cleanup: jest.fn() }, // Assuming static cleanup
}));

// --- Mocking DOM and localStorage ---
let getElementByIdMock: jest.Mock;
let querySelectorMock: jest.Mock;
let appendChildSpy: jest.Mock;

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

// Declare globally scoped mock DOM elements
let mockThemeToggleButton: HTMLButtonElement;
let mockThemeIcon: HTMLElement;
let mockSettingsModal: HTMLDivElement;
let mockCloseSettingsModal: HTMLButtonElement;
let mockCancelSettings: HTMLButtonElement;
let mockRecordButton: HTMLButtonElement;
let mockTranscriptionArea: HTMLTextAreaElement;
let mockPolishedNoteArea: HTMLDivElement;
let mockStatusDisplay: HTMLDivElement;
let mockApiKeyInput: HTMLInputElement;
let mockRememberApiKeyCheckbox: HTMLInputElement;
let mockSettingsButton: HTMLButtonElement;
let mockSaveSettings: HTMLButtonElement;
let mockTestChartButton: HTMLButtonElement;
let mockSampleChartsButton: HTMLButtonElement;
let mockNewButton: HTMLButtonElement;
let mockPolishedTab: HTMLButtonElement;
let mockExportButton: HTMLButtonElement;
let mockPerformanceToggleButton: HTMLButtonElement;

describe('AudioTranscriptionApp Unit Tests - Core Setup', () => {
  let app: AudioTranscriptionApp;
  let container: HTMLElement;

  // Aliases for tests to use the shared/mocked instances
  let MockedAPIService: jest.Mocked<APIService>;
  let MockedAudioRecorder: jest.Mocked<AudioRecorder>;
  let MockedChartManager: jest.Mocked<ChartManager>;
  let MockedPerformanceMonitor: jest.Mocked<PerformanceMonitor>;
  let MockedIntervalManager: jest.Mocked<IntervalManager>;
  let MockedBundleOptimizer: jest.Mocked<BundleOptimizer>;
  let MockedProductionMonitor: jest.Mocked<ProductionMonitor>;
  let MockedHealthCheckService: jest.Mocked<HealthCheckService>;
  let MockedMemoryManager: jest.Mocked<MemoryManager>;
  let mockSettingsModalInstance: jest.Mocked<SettingsModal>;

  beforeEach(() => {
    // Instantiate and configure shared instances for new-able classes, then assign to module-scoped 'let' variables
    const ActualAPIServiceManualMock = jest.requireActual('../services/__mocks__/APIService').APIService;
    const tempAPIService = new ActualAPIServiceManualMock() as jest.Mocked<APIService>;
    tempAPIService.hasValidApiKey = jest.fn();
    tempAPIService.testConnection = jest.fn();
    tempAPIService.polishTranscription = jest.fn();
    tempAPIService.generateChartData = jest.fn();
    tempAPIService.generateSampleChartData = jest.fn();
    tempAPIService.setApiKey = jest.fn();
    mockSharedAPIServiceInstance = tempAPIService;
    MockedAPIService = mockSharedAPIServiceInstance;

    const ActualAudioRecorderClass = jest.requireActual('../services/AudioRecorder').AudioRecorder;
    const tempAudioRecorder = new ActualAudioRecorderClass() as jest.Mocked<AudioRecorder>;
    tempAudioRecorder.isSupported = jest.fn();
    tempAudioRecorder.getIsRecording = jest.fn();
    tempAudioRecorder.startRecording = jest.fn();
    tempAudioRecorder.stopRecording = jest.fn();
    tempAudioRecorder.onTranscriptAvailable = jest.fn();
    tempAudioRecorder.onRecordingStateChange = jest.fn();
    tempAudioRecorder.formatDuration = jest.fn();
    tempAudioRecorder.cleanup = jest.fn();
    mockSharedAudioRecorderInstance = tempAudioRecorder;
    MockedAudioRecorder = mockSharedAudioRecorderInstance;

    const ActualChartManagerClass = jest.requireActual('../services/ChartManager').ChartManager;
    const tempChartManager = new ActualChartManagerClass() as jest.Mocked<ChartManager>;
    tempChartManager.createChart = jest.fn();
    tempChartManager.destroyAllCharts = jest.fn();
    tempChartManager.resizeAllCharts = jest.fn();
    mockSharedChartManagerInstance = tempChartManager;
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

    // Reset all mocks
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

    // Initialize DOM element mocks
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
    mockSettingsModal = document.createElement('div'); mockSettingsModal.id = 'settingsModal'; mockSettingsModal.style.display = 'none';
    mockCloseSettingsModal = document.createElement('button'); mockCloseSettingsModal.id = 'closeSettingsModal';
    mockCancelSettings = document.createElement('button'); mockCancelSettings.id = 'cancelSettings';
    mockSaveSettings = document.createElement('button'); mockSaveSettings.id = 'saveSettings';
    mockTestChartButton = document.createElement('button'); mockTestChartButton.id = 'testChartButton';
    mockSampleChartsButton = document.createElement('button'); mockSampleChartsButton.id = 'sampleChartsButton';
    mockNewButton = document.createElement('button'); mockNewButton.id = 'newButton';
    mockPolishedTab = document.createElement('button'); mockPolishedTab.dataset.tab = 'note';
    mockExportButton = document.createElement('button'); mockExportButton.id = 'confirmExport';
    mockPerformanceToggleButton = document.createElement('button'); mockPerformanceToggleButton.id = 'performanceToggleButton';

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
        case 'settingsModal': return mockSettingsModal;
        case 'closeSettingsModal': return mockCloseSettingsModal;
        case 'cancelSettings': return mockCancelSettings;
        case 'saveSettings': return mockSaveSettings;
        case 'testChartButton': return mockTestChartButton;
        case 'sampleChartsButton': return mockSampleChartsButton;
        case 'newButton': return mockNewButton;
        case 'confirmExport': return mockExportButton;
        case 'performanceToggleButton': return mockPerformanceToggleButton;
        default: return document.createElement('div');
      }
    });
    querySelectorMock = jest.fn().mockImplementation((selector: string) => {
      if (selector === '[data-tab="note"]') return mockPolishedTab;
      return document.createElement('div');
    });
    appendChildSpy = jest.fn();
    Object.defineProperty(document, 'getElementById', { value: getElementByIdMock, configurable: true });
    Object.defineProperty(document, 'querySelector', { value: querySelectorMock, configurable: true });
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(), }))});

    // Set default behaviors for mocked methods AFTER they've been reset
    MockedAPIService.hasValidApiKey.mockReturnValue(true);
    MockedAPIService.testConnection.mockResolvedValue({ success: true });
    MockedAudioRecorder.isSupported.mockReturnValue(true);
    MockedAudioRecorder.getIsRecording.mockReturnValue(false);
    MockedHealthCheckService.getHealthStatus.mockResolvedValue({ status: 'healthy', checks: {} });
    MockedBundleOptimizer.loadCriticalModules.mockResolvedValue(undefined);
    (DataProcessor.getAllNotes as jest.Mock).mockReturnValue([]);
    MockedPerformanceMonitor.measureOperation.mockImplementation((fn: () => any) => { const res = fn(); return (res && typeof res.then === 'function') ? res : Promise.resolve(res); });
    MockedPerformanceMonitor.getRecentOperations.mockReturnValue([]);
    MockedIntervalManager.createRecurringTask.mockReturnValue(1);

    container = document.createElement('div');
    container.appendChild(mockRecordButton); container.appendChild(mockTranscriptionArea); container.appendChild(mockPolishedNoteArea); container.appendChild(mockStatusDisplay); container.appendChild(mockApiKeyInput); container.appendChild(mockRememberApiKeyCheckbox);
    document.body.appendChild(mockSettingsModal);
    document.body.appendChild(mockCloseSettingsModal);
    document.body.appendChild(mockCancelSettings);
    document.body.appendChild(mockSaveSettings);
    document.body.appendChild(mockSettingsButton);
    document.body.appendChild(mockThemeToggleButton);
    document.body.appendChild(mockTestChartButton);
    document.body.appendChild(mockSampleChartsButton);
    document.body.appendChild(mockNewButton);
    document.body.appendChild(mockPolishedTab);
    document.body.appendChild(mockExportButton);
    document.body.appendChild(mockPerformanceToggleButton);

    app = new AudioTranscriptionApp(container); // App constructor uses the mocked services

    // Get the instance of SettingsModal created by AudioTranscriptionApp
    if ((SettingsModal as jest.Mock).mock.instances.length > 0) {
        mockSettingsModalInstance = (SettingsModal as jest.Mock).mock.instances[0] as jest.Mocked<SettingsModal>;
        mockSettingsModalInstance.open = jest.fn();
        if (typeof mockSettingsModalInstance.cleanup === 'function') {
             mockSettingsModalInstance.cleanup = jest.fn();
        }
    } else {
        // Fallback if SettingsModal instance isn't found (should not happen if mock factory works)
        mockSettingsModalInstance = { open: jest.fn(), cleanup: jest.fn() } as any;
    }
  });

  afterEach(() => {
    if (mockSettingsModal.parentNode === document.body) document.body.removeChild(mockSettingsModal);
    if (mockCloseSettingsModal.parentNode === document.body) document.body.removeChild(mockCloseSettingsModal);
    if (mockCancelSettings.parentNode === document.body) document.body.removeChild(mockCancelSettings);
    if (mockSettingsButton.parentNode === document.body) document.body.removeChild(mockSettingsButton);
    if (mockThemeToggleButton.parentNode === document.body) document.body.removeChild(mockThemeToggleButton);
    if (mockSaveSettings.parentNode === document.body) document.body.removeChild(mockSaveSettings);
    if (mockTestChartButton.parentNode === document.body) document.body.removeChild(mockTestChartButton);
    if (mockSampleChartsButton.parentNode === document.body) document.body.removeChild(mockSampleChartsButton);
    if (mockNewButton.parentNode === document.body) document.body.removeChild(mockNewButton);
    if (mockPolishedTab.parentNode === document.body) document.body.removeChild(mockPolishedTab);
    if (mockExportButton.parentNode === document.body) document.body.removeChild(mockExportButton);
    if (mockPerformanceToggleButton.parentNode === document.body) document.body.removeChild(mockPerformanceToggleButton);
    jest.restoreAllMocks();
  });

  describe('Initialization (init method)', () => {
    it('should call key setup and service methods on init (and setup DOM references)', async () => {
      const setupDOMReferencesSpy = jest.spyOn(app as any, 'setupDOMReferences');
      const initThemeSpy = jest.spyOn(app as any, 'initTheme');
      const setupEventListenersSpy = jest.spyOn(app as any, 'setupEventListeners');

      await app.init();

      expect(setupDOMReferencesSpy).toHaveBeenCalled();
      expect(initThemeSpy).toHaveBeenCalled();
      expect(setupEventListenersSpy).toHaveBeenCalled();
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
      setupEventListenersSpy.mockRestore();
    });

    it('should instantiate SettingsModal with APIService and onApiKeyUpdated callback, and callback should trigger testAPIConnection', () => {
      expect(SettingsModal).toHaveBeenCalledTimes(1);
      const constructorOptions = (SettingsModal as jest.Mock).mock.calls[0][0];
      expect(constructorOptions.apiService).toBe(MockedAPIService);

      const testAPIConnectionSpy = jest.spyOn(app as any, 'testAPIConnection').mockResolvedValue(undefined);

      constructorOptions.onApiKeyUpdated();
      expect(testAPIConnectionSpy).toHaveBeenCalled();

      testAPIConnectionSpy.mockRestore();
    });

    it('should correctly find or create essential DOM elements', async () => {
      const containerQuerySelectorSpy = jest.spyOn(container, 'querySelector');
      const setupDOMReferencesSpy = jest.spyOn(app as any, 'setupDOMReferences');

      await app.init();

      expect(setupDOMReferencesSpy).toHaveBeenCalled();
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#recordButton');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#rawTranscription');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#polishedNote');
      expect(containerQuerySelectorSpy).toHaveBeenCalledWith('#recordingStatus');

      setupDOMReferencesSpy.mockRestore();
      containerQuerySelectorSpy.mockRestore();
    });

    it('should initialize API key from localStorage if present', async () => {
      localStorageMock.setItem('geminiApiKey', 'test-api-key-localstorage');
      await app.init();
      expect(MockedAPIService.setApiKey).toHaveBeenCalledWith('test-api-key-localstorage');
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
    });

    it('should apply dark theme by default if no theme is in localStorage', async () => {
      localStorageMock.clear();
      const initThemeSpy = jest.spyOn(app as any, 'initTheme');
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

  describe('Event Listener Setup and Basic Actions', () => {
    it('should call toggleRecording when recordButton is clicked', async () => {
      await app.init();
      const toggleRecordingSpy = jest.spyOn(app as any, 'toggleRecording').mockImplementation(() => {});
      fireEvent.click(mockRecordButton);
      expect(toggleRecordingSpy).toHaveBeenCalled();
      toggleRecordingSpy.mockRestore();
    });

    it('should call toggleTheme when themeToggleButton is clicked', async () => {
      await app.init();
      const toggleThemeSpy = jest.spyOn(app as any, 'toggleTheme').mockImplementation(() => {});
      fireEvent.click(mockThemeToggleButton);
      expect(toggleThemeSpy).toHaveBeenCalled();
      toggleThemeSpy.mockRestore();
    });

    it('should call generateCharts when testChartButton is clicked', async () => {
      await app.init();
      const generateChartsSpy = jest.spyOn(app as any, 'generateCharts').mockImplementation(async () => {});
      fireEvent.click(mockTestChartButton);
      expect(generateChartsSpy).toHaveBeenCalled();
      generateChartsSpy.mockRestore();
    });

    it('should call generateSampleCharts when sampleChartsButton is clicked', async () => {
      await app.init();
      const generateSampleChartsSpy = jest.spyOn(app as any, 'generateSampleCharts').mockImplementation(async () => {});
      fireEvent.click(mockSampleChartsButton);
      expect(generateSampleChartsSpy).toHaveBeenCalled();
      generateSampleChartsSpy.mockRestore();
    });

    it('should call clearCurrentNote when newButton is clicked', async () => {
      await app.init();
      const clearCurrentNoteSpy = jest.spyOn(app as any, 'clearCurrentNote').mockImplementation(() => {});
      fireEvent.click(mockNewButton);
      expect(clearCurrentNoteSpy).toHaveBeenCalled();
      clearCurrentNoteSpy.mockRestore();
    });

    it('should call switchToPolishedTab when polishedTab is clicked', async () => {
      await app.init();
      const switchToPolishedTabSpy = jest.spyOn(app as any, 'switchToPolishedTab').mockImplementation(() => {});
      fireEvent.click(mockPolishedTab);
      expect(switchToPolishedTabSpy).toHaveBeenCalled();
      switchToPolishedTabSpy.mockRestore();
    });

    it('should call exportNotes when exportButton is clicked', async () => {
      await app.init();
      const exportNotesSpy = jest.spyOn(app as any, 'exportNotes').mockImplementation(() => {});
      const exportButtonElement = container.querySelector('#confirmExport') || document.getElementById('confirmExport');
      if (exportButtonElement) {
         fireEvent.click(exportButtonElement);
         expect(exportNotesSpy).toHaveBeenCalled();
      } else {
        throw new Error('Export button not found in test DOM');
      }
      exportNotesSpy.mockRestore();
    });

    it('should call togglePerformanceIndicator when performanceToggleButton is clicked', async () => {
      await app.init();
      const togglePerformanceIndicatorSpy = jest.spyOn(app as any, 'togglePerformanceIndicator').mockImplementation(() => {});
      fireEvent.click(mockPerformanceToggleButton);
      expect(togglePerformanceIndicatorSpy).toHaveBeenCalled();
      togglePerformanceIndicatorSpy.mockRestore();
    });
  });

  describe('toggleRecording Logic', () => {
    let showToastSpy: jest.SpyInstance;

    beforeEach(() => {
      showToastSpy = jest.spyOn(app as any, 'showToast').mockImplementation(() => {});
      MockedAudioRecorder.isSupported.mockReset();
      MockedAudioRecorder.getIsRecording.mockReset();
      MockedAudioRecorder.startRecording.mockReset();
      MockedAudioRecorder.stopRecording.mockReset();
      (app as any).state.isRecording = false;
      (app as any).currentTranscript = '';
      (app as any).transcriptBuffer = '';
      if (mockTranscriptionArea) mockTranscriptionArea.value = '';
      if (mockPolishedNoteArea) mockPolishedNoteArea.textContent = '';
    });

    afterEach(() => {
      showToastSpy.mockRestore();
    });

    it('should show error if AudioRecorder is not supported', async () => {
      MockedAudioRecorder.isSupported.mockReturnValue(false);
      await app.init();
      await app.toggleRecording();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Audio recording is not supported in this browser.', }));
      expect(MockedAudioRecorder.startRecording).not.toHaveBeenCalled();
    });

    it('should start recording successfully', async () => {
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(false);
      MockedAudioRecorder.startRecording.mockResolvedValue(true);
      mockTranscriptionArea.value = 'previous transcript';
      mockPolishedNoteArea.textContent = 'previous polished note';
      await app.init();
      await app.toggleRecording();
      expect(MockedAudioRecorder.startRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(true);
      expect(mockTranscriptionArea.value).toBe('');
      expect(mockPolishedNoteArea.textContent).toBe('');
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'info', title: 'Recording Started', }));
    });

    it('should show error if starting a recording fails', async () => {
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(false);
      MockedAudioRecorder.startRecording.mockResolvedValue(false);
      await app.init();
      await app.toggleRecording();
      expect(MockedAudioRecorder.startRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(false);
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Recording Failed', }));
    });

    it('should stop recording successfully with a transcript, and attempt polishing', async () => {
      await app.init();
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(true);
      MockedAudioRecorder.stopRecording.mockImplementation(async () => {
        (app as any).currentTranscript = "mock raw transcript";
        (app as any).transcriptBuffer = "mock raw transcript";
        return "mock raw transcript";
      });
      const polishSpy = jest.spyOn(app as any, 'polishCurrentTranscription').mockResolvedValue(undefined);
      await app.toggleRecording();
      expect(MockedAudioRecorder.stopRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(false);
      expect(polishSpy).toHaveBeenCalledWith();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Recording Complete', }));
      expect(mockRecordButton.textContent).toBe('Start Recording');
      polishSpy.mockRestore();
    });

    it('should stop recording successfully with NO transcript, and not attempt polishing', async () => {
      await app.init();
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(true);
      MockedAudioRecorder.stopRecording.mockImplementation(async () => {
        (app as any).currentTranscript = "";
        (app as any).transcriptBuffer = "";
        return "";
      });
      const polishSpy = jest.spyOn(app as any, 'polishCurrentTranscription').mockResolvedValue(undefined);
      await app.toggleRecording();
      expect(MockedAudioRecorder.stopRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(false);
      expect(polishSpy).not.toHaveBeenCalled();
      expect(mockStatusDisplay.textContent).toBe('Status: Idle');
      expect(mockRecordButton.textContent).toBe('Start Recording');
      polishSpy.mockRestore();
    });
  });

  describe('polishCurrentTranscription Logic', () => {
    let showToastSpy: jest.SpyInstance;

    beforeEach(() => {
      showToastSpy = jest.spyOn(app as any, 'showToast').mockImplementation(() => {});
      MockedAPIService.hasValidApiKey.mockReset();
      MockedAPIService.polishTranscription.mockReset();
      (app as any).currentTranscript = '';
    });

    afterEach(() => {
      showToastSpy.mockRestore();
    });

    it('should show warning if no transcript is available to polish', async () => {
      await app.init();
      (app as any).currentTranscript = '';
      await app.polishCurrentTranscription();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'No Transcription', message: 'Please record something first.', }));
      expect(MockedAPIService.polishTranscription).not.toHaveBeenCalled();
    });

    it('should show warning if API key is missing when attempting to polish', async () => {
      await app.init();
      (app as any).currentTranscript = "some raw transcript";
      MockedAPIService.hasValidApiKey.mockReturnValue(false);
      await app.polishCurrentTranscription();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'API Key Required', message: 'Please enter your Gemini API key.', }));
      expect(MockedAPIService.polishTranscription).not.toHaveBeenCalled();
    });

    it('should successfully polish a transcript', async () => {
      await app.init();
      const rawTranscript = "raw transcript for polishing";
      (app as any).currentTranscript = rawTranscript;
      MockedAPIService.hasValidApiKey.mockReturnValue(true);
      MockedAPIService.polishTranscription.mockResolvedValue({ success: true, data: "polished mock transcript" });
      const updateUISpy = jest.spyOn(app as any, 'updateUI').mockImplementation(() => {});
      await app.polishCurrentTranscription();
      expect(MockedAPIService.polishTranscription).toHaveBeenCalledWith(rawTranscript);
      expect((app as any).state.currentNote.rawTranscription).toBe(rawTranscript);
      expect((app as any).state.currentNote.polishedNote).toBe("polished mock transcript");
      expect(mockPolishedNoteArea.textContent).toBe("polished mock transcript");
      expect(mockStatusDisplay.textContent).toBe("Status: Polished");
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Polishing Complete', }));
      expect((app as any).state.isProcessing).toBe(false);
      expect(updateUISpy).toHaveBeenCalled();
      updateUISpy.mockRestore();
    });

    it('should handle API failure when polishing (error object returned)', async () => {
      await app.init();
      const rawTranscript = "raw transcript for API failure";
      (app as any).currentTranscript = rawTranscript;
      MockedAPIService.hasValidApiKey.mockReturnValue(true);
      MockedAPIService.polishTranscription.mockResolvedValue({ success: false, error: "API polishing failed from test" });
      await app.polishCurrentTranscription();
      expect(MockedAPIService.polishTranscription).toHaveBeenCalledWith(rawTranscript);
      expect(mockStatusDisplay.textContent).toBe("Status: Error Polishing");
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Polishing Failed', message: "API polishing failed from test", }));
      expect((app as any).state.isProcessing).toBe(false);
    });

    it('should handle API call exception during polishing', async () => {
      await app.init();
      const rawTranscript = "raw transcript for exception";
      (app as any).currentTranscript = rawTranscript;
      MockedAPIService.hasValidApiKey.mockReturnValue(true);
      MockedAPIService.polishTranscription.mockRejectedValue(new Error("Network connection error"));
      await app.polishCurrentTranscription();
      expect(MockedAPIService.polishTranscription).toHaveBeenCalledWith(rawTranscript);
      expect(mockStatusDisplay.textContent).toBe("Status: Error Polishing");
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Processing Error', message: 'An error occurred while polishing the transcription.', }));
      expect((app as any).state.isProcessing).toBe(false);
    });
  });

  describe('Note Management Logic', () => {
    let showToastSpy: jest.SpyInstance;
    let updateNotesDisplaySpy: jest.SpyInstance;
    let updateTranscriptionAreaSpy: jest.SpyInstance;
    let updatePolishedNoteAreaSpy: jest.SpyInstance;

    beforeEach(() => {
      showToastSpy = jest.spyOn(app as any, 'showToast').mockImplementation(() => {});
      updateNotesDisplaySpy = jest.spyOn(app as any, 'updateNotesDisplay').mockImplementation(() => {});
      updateTranscriptionAreaSpy = jest.spyOn(app as any, 'updateTranscriptionArea').mockImplementation(() => {});
      updatePolishedNoteAreaSpy = jest.spyOn(app as any, 'updatePolishedNoteArea').mockImplementation(() => {});
      (DataProcessor.saveNote as jest.Mock).mockReset();
      (DataProcessor.getAllNotes as jest.Mock).mockReset();
      (DataProcessor.deleteNote as jest.Mock).mockReset();
      MockedChartManager.destroyAllCharts.mockReset();
      (app as any).state.currentNote = null;
      (app as any).state.notes = [];
    });

    afterEach(() => {
      showToastSpy.mockRestore();
      updateNotesDisplaySpy.mockRestore();
      updateTranscriptionAreaSpy.mockRestore();
      updatePolishedNoteAreaSpy.mockRestore();
    });

    it('should show warning if trying to save when there is no current note', async () => {
      await app.init();
      (app as any).state.currentNote = null;
      app.saveCurrentNote();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'No Note', message: 'There is no note to save.', }));
      expect(DataProcessor.saveNote).not.toHaveBeenCalled();
    });

    it('should save a current note successfully', async () => {
      await app.init();
      const mockNote = { id: 'note1', rawTranscription: 'raw text', polishedNote: 'polished text', timestamp: Date.now() };
      (app as any).state.currentNote = mockNote;
      (DataProcessor.getAllNotes as jest.Mock).mockReturnValue([mockNote]);
      app.saveCurrentNote();
      expect(DataProcessor.saveNote).toHaveBeenCalledWith(mockNote);
      expect(DataProcessor.getAllNotes).toHaveBeenCalled();
      expect(updateNotesDisplaySpy).toHaveBeenCalled();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Note Saved', message: 'Your note has been saved successfully.', }));
    });

    it('should clear current note, transcript, buffer, and charts', async () => {
      await app.init();
      (app as any).currentTranscript = "test transcript";
      (app as any).transcriptBuffer = "test buffer";
      (app as any).state.currentNote = { id: '1', rawTranscription: 'raw', polishedNote: 'polished', timestamp: Date.now() };
      const updateUISpy = jest.spyOn(app as any, 'updateUI').mockImplementation(() => {});
      app.clearCurrentNote();
      expect((app as any).currentTranscript).toBe('');
      expect((app as any).transcriptBuffer).toBe('');
      expect((app as any).state.currentNote).toBeNull();
      expect(MockedChartManager.destroyAllCharts).toHaveBeenCalled();
      expect(updateUISpy).toHaveBeenCalled();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'info', title: 'Cleared', message: 'Current note and charts have been cleared.', }));
      updateUISpy.mockRestore();
    });

    it('should delete a note successfully and update display', async () => {
      await app.init();
      const noteIdToDelete = 'note-to-delete-id';
      (DataProcessor.deleteNote as jest.Mock).mockReturnValue(true);
      (DataProcessor.getAllNotes as jest.Mock).mockReturnValue([]);
      app.deleteNote(noteIdToDelete);
      expect(DataProcessor.deleteNote).toHaveBeenCalledWith(noteIdToDelete);
      expect(DataProcessor.getAllNotes).toHaveBeenCalled();
      expect(updateNotesDisplaySpy).toHaveBeenCalled();
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Note Deleted', message: 'The note has been deleted.', }));
    });

    it('should not show success toast if DataProcessor fails to delete a note', async () => {
      await app.init();
      const noteIdToDelete = 'another-id';
      (DataProcessor.deleteNote as jest.Mock).mockReturnValue(false);
      app.deleteNote(noteIdToDelete);
      expect(DataProcessor.deleteNote).toHaveBeenCalledWith(noteIdToDelete);
      expect(showToastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Note Deleted', }));
    });

    it('should load a note into the current state and update UI areas', async () => {
      await app.init();
      const mockNoteToLoad = { id: 'test-id-123', rawTranscription: 'loaded raw transcript', polishedNote: 'loaded polished note', timestamp: Date.now() };
      (app as any).state.notes = [mockNoteToLoad];
      app.loadNote('test-id-123');
      expect((app as any).state.currentNote).toEqual(mockNoteToLoad);
      expect((app as any).currentTranscript).toBe(mockNoteToLoad.rawTranscription);
      expect(updateTranscriptionAreaSpy).toHaveBeenCalled();
      expect(updatePolishedNoteAreaSpy).toHaveBeenCalled();
    });
  });
});
