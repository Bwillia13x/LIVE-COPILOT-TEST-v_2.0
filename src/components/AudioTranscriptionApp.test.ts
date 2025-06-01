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
import { fireEvent } from '@testing-library/dom';

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

  let MockedAPIService: jest.Mocked<APIService>;
  let MockedAudioRecorder: jest.Mocked<AudioRecorder>;
  let MockedChartManager: jest.Mocked<ChartManager>;
  let MockedPerformanceMonitor: jest.Mocked<PerformanceMonitor>;
  let MockedIntervalManager: jest.Mocked<IntervalManager>;
  let MockedBundleOptimizer: jest.Mocked<BundleOptimizer>;
  let MockedProductionMonitor: jest.Mocked<ProductionMonitor>;
  let MockedHealthCheckService: jest.Mocked<HealthCheckService>;
  let MockedMemoryManager: jest.Mocked<MemoryManager>;

  beforeEach(() => {
    const ActualAPIServiceManualMock = jest.requireActual('../services/__mocks__/APIService').APIService;
    mockSharedAPIServiceInstance = new ActualAPIServiceManualMock() as jest.Mocked<APIService>;
    mockSharedAPIServiceInstance.hasValidApiKey = jest.fn();
    mockSharedAPIServiceInstance.testConnection = jest.fn();
    mockSharedAPIServiceInstance.polishTranscription = jest.fn();
    mockSharedAPIServiceInstance.generateChartData = jest.fn();
    mockSharedAPIServiceInstance.generateSampleChartData = jest.fn();
    mockSharedAPIServiceInstance.setApiKey = jest.fn();
    MockedAPIService = mockSharedAPIServiceInstance;

    const ActualAudioRecorderClass = jest.requireActual('../services/AudioRecorder').AudioRecorder;
    mockSharedAudioRecorderInstance = new ActualAudioRecorderClass() as jest.Mocked<AudioRecorder>;
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
    mockSharedChartManagerInstance.createChart = jest.fn();
    mockSharedChartManagerInstance.destroyAllCharts = jest.fn();
    mockSharedChartManagerInstance.resizeAllCharts = jest.fn();
    MockedChartManager = mockSharedChartManagerInstance;

    MockedPerformanceMonitor = { startMonitoring: jest.fn(), measureOperation: jest.fn((fn: () => any) => fn()), getLatestMetrics: jest.fn(), getAlerts: jest.fn(), cleanup: jest.fn(), getRecentOperations: jest.fn().mockReturnValue([]), } as jest.Mocked<PerformanceMonitor>;
    MockedIntervalManager = { createRecurringTask: jest.fn(), clearInterval: jest.fn(), clearTimeout: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<IntervalManager>;
    MockedBundleOptimizer = { registerLazyModule: jest.fn(), loadCriticalModules: jest.fn(), cleanup: jest.fn(), loadLazyModule: jest.fn(), } as jest.Mocked<BundleOptimizer>;
    MockedProductionMonitor = { trackEvent: jest.fn(), trackError: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<ProductionMonitor>;
    MockedHealthCheckService = { getHealthStatus: jest.fn(), cleanup: jest.fn(), } as jest.Mocked<HealthCheckService>;
    MockedMemoryManager = { trackInterval: jest.fn(), clearInterval: jest.fn(), clearTimeout: jest.fn(), getStats: jest.fn().mockReturnValue({ intervals: 0, timeouts: 0, eventListeners: 0 }), cleanup: jest.fn(), } as jest.Mocked<MemoryManager>;

    (PerformanceMonitor.getInstance as jest.Mock).mockReturnValue(MockedPerformanceMonitor);
    (IntervalManager.getInstance as jest.Mock).mockReturnValue(MockedIntervalManager);
    (BundleOptimizer.getInstance as jest.Mock).mockReturnValue(MockedBundleOptimizer);
    (ProductionMonitor.getInstance as jest.Mock).mockReturnValue(MockedProductionMonitor);
    (HealthCheckService.getInstance as jest.Mock).mockReturnValue(MockedHealthCheckService);
    (MemoryManager.getInstance as jest.Mock).mockReturnValue(MockedMemoryManager);

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
    mockPolishedTab = document.createElement('button'); mockPolishedTab.dataset.tab = 'note'; // Set dataset for querySelector
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
        case 'confirmExport': return mockExportButton; // Added
        case 'performanceToggleButton': return mockPerformanceToggleButton; // Added
        default: return document.createElement('div');
      }
    });
    querySelectorMock = jest.fn().mockImplementation((selector: string) => {
      if (selector === '[data-tab="note"]') return mockPolishedTab; // Use the shared mock
      // Add other document.querySelector mocks if needed by initTheme or other unmocked methods
      return document.createElement('div');
    });
    appendChildSpy = jest.fn();
    Object.defineProperty(document, 'getElementById', { value: getElementByIdMock, configurable: true });
    Object.defineProperty(document, 'querySelector', { value: querySelectorMock, configurable: true });
    Object.defineProperty(document.body, 'appendChild', { value: appendChildSpy, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(), }))});

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
    // Add modal elements to the main document body as they are typically global
    document.body.appendChild(mockSettingsModal);
    document.body.appendChild(mockCloseSettingsModal);
    document.body.appendChild(mockCancelSettings);
    document.body.appendChild(mockSaveSettings); // Added to body
    document.body.appendChild(mockSettingsButton);
    document.body.appendChild(mockThemeToggleButton);
    document.body.appendChild(mockTestChartButton);
    document.body.appendChild(mockSampleChartsButton);
    document.body.appendChild(mockNewButton);
    document.body.appendChild(mockPolishedTab); // Added to body
    document.body.appendChild(mockExportButton); // Added to body
    document.body.appendChild(mockPerformanceToggleButton); // Added to body

    app = new AudioTranscriptionApp(container);

    // jest.spyOn(app as any, 'setupEventListeners').mockImplementation(() => {}); // Keep this unmocked
  });

  afterEach(() => {
    // Clean up elements added to document.body
    if (mockSettingsModal.parentNode === document.body) document.body.removeChild(mockSettingsModal);
    if (mockCloseSettingsModal.parentNode === document.body) document.body.removeChild(mockCloseSettingsModal);
    if (mockCancelSettings.parentNode === document.body) document.body.removeChild(mockCancelSettings);
    if (mockSettingsButton.parentNode === document.body) document.body.removeChild(mockSettingsButton);
    if (mockThemeToggleButton.parentNode === document.body) document.body.removeChild(mockThemeToggleButton);
    if (mockSaveSettings.parentNode === document.body) document.body.removeChild(mockSaveSettings); // Added cleanup
    if (mockTestChartButton.parentNode === document.body) document.body.removeChild(mockTestChartButton);
    if (mockSampleChartsButton.parentNode === document.body) document.body.removeChild(mockSampleChartsButton);
    if (mockNewButton.parentNode === document.body) document.body.removeChild(mockNewButton);
    if (mockPolishedTab.parentNode === document.body) document.body.removeChild(mockPolishedTab); // Added cleanup
    if (mockExportButton.parentNode === document.body) document.body.removeChild(mockExportButton); // Added cleanup
    if (mockPerformanceToggleButton.parentNode === document.body) document.body.removeChild(mockPerformanceToggleButton); // Added cleanup
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
      expect(setupEventListenersSpy).toHaveBeenCalled(); // Now checking this too
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
      fireEvent.click(mockRecordButton); // mockRecordButton is from beforeEach scope
      expect(toggleRecordingSpy).toHaveBeenCalled();
      toggleRecordingSpy.mockRestore();
    });

    it('should call toggleTheme when themeToggleButton is clicked', async () => {
      await app.init();
      const toggleThemeSpy = jest.spyOn(app as any, 'toggleTheme').mockImplementation(() => {});
      fireEvent.click(mockThemeToggleButton); // mockThemeToggleButton is from beforeEach scope
      expect(toggleThemeSpy).toHaveBeenCalled();
      toggleThemeSpy.mockRestore();
    });

    it('should handle API key input change', async () => {
      await app.init();
      const testApiKey = 'test-key-123';
      const testAPIConnectionSpy = jest.spyOn(app as any, 'testAPIConnection').mockResolvedValue(undefined);
      fireEvent.change(mockApiKeyInput, { target: { value: testApiKey } });
      expect(MockedAPIService.setApiKey).toHaveBeenCalledWith(testApiKey);
      expect(testAPIConnectionSpy).toHaveBeenCalled();
      testAPIConnectionSpy.mockRestore();
    });

    it('should open settings modal and load API key from localStorage', async () => {
      localStorageMock.setItem('geminiApiKey', 'stored-key-456');
      mockSettingsModal.style.display = 'none';
      await app.init();
      fireEvent.click(mockSettingsButton); // mockSettingsButton is from beforeEach scope
      expect(mockSettingsModal.style.getPropertyValue('display')).toBe('flex');
      expect(mockApiKeyInput.value).toBe('stored-key-456');
    });

    it('should close settings modal via close button', async () => {
      await app.init();
      mockSettingsModal.style.setProperty('display', 'flex');
      fireEvent.click(mockCloseSettingsModal); // mockCloseSettingsModal is from beforeEach scope
      expect(mockSettingsModal.style.getPropertyValue('display')).toBe('none');
    });

    it('should close settings modal via cancel button', async () => {
      await app.init();
      mockSettingsModal.style.setProperty('display', 'flex');
      fireEvent.click(mockCancelSettings); // mockCancelSettings is from beforeEach scope
      expect(mockSettingsModal.style.getPropertyValue('display')).toBe('none');
    });

    it('should save API key to localStorage and close settings modal when save (remember true)', async () => {
      await app.init();
      const testApiKey = 'save-this-key-permanently';
      const testAPIConnectionSpy = jest.spyOn(app as any, 'testAPIConnection').mockResolvedValue(undefined);

      fireEvent.click(mockSettingsButton); // Open modal
      mockApiKeyInput.value = testApiKey;
      mockRememberApiKeyCheckbox.checked = true;

      fireEvent.click(mockSaveSettings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('geminiApiKey', testApiKey);
      expect(MockedAPIService.setApiKey).toHaveBeenCalledWith(testApiKey);
      expect(testAPIConnectionSpy).toHaveBeenCalled();
      expect(mockSettingsModal.style.getPropertyValue('display')).toBe('none');

      testAPIConnectionSpy.mockRestore();
    });

    it('should set API key for session (remove from localStorage) and close modal when save (remember false)', async () => {
      await app.init();
      const testApiKey = 'session-only-key-123';
      const testAPIConnectionSpy = jest.spyOn(app as any, 'testAPIConnection').mockResolvedValue(undefined);

      // Ensure something might be in local storage first to test removal
      localStorageMock.setItem('geminiApiKey', 'some-old-key');

      fireEvent.click(mockSettingsButton); // Open modal
      mockApiKeyInput.value = testApiKey;
      mockRememberApiKeyCheckbox.checked = false;

      fireEvent.click(mockSaveSettings);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('geminiApiKey');
      expect(MockedAPIService.setApiKey).toHaveBeenCalledWith(testApiKey);
      expect(testAPIConnectionSpy).toHaveBeenCalled();
      expect(mockSettingsModal.style.getPropertyValue('display')).toBe('none');

      testAPIConnectionSpy.mockRestore();
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

      // mockPolishedTab is returned by querySelectorMock for '[data-tab="note"]'
      // setupEventListeners uses document.querySelector for this one.
      fireEvent.click(mockPolishedTab);
      expect(switchToPolishedTabSpy).toHaveBeenCalled();
      switchToPolishedTabSpy.mockRestore();
    });

    it('should call exportNotes when exportButton is clicked', async () => {
      await app.init();
      const exportNotesSpy = jest.spyOn(app as any, 'exportNotes').mockImplementation(() => {});

      // mockExportButton should be in the container and found by this.elements.exportButton
      // if setupDOMReferences correctly assigned it.
      // Or, if setupEventListeners uses getElementById for it:
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

      // performanceToggleButton is returned by getElementByIdMock for 'performanceToggleButton'
      // setupEventListeners uses document.getElementById for this one.
      fireEvent.click(mockPerformanceToggleButton);
      expect(togglePerformanceIndicatorSpy).toHaveBeenCalled();
      togglePerformanceIndicatorSpy.mockRestore();
    });
  });

  describe('toggleRecording Logic', () => {
    let showToastSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on showToast for all tests in this block
      showToastSpy = jest.spyOn(app as any, 'showToast').mockImplementation(() => {});
      // Reset relevant mocks before each test
      MockedAudioRecorder.isSupported.mockReset();
      MockedAudioRecorder.getIsRecording.mockReset();
      MockedAudioRecorder.startRecording.mockReset();
      MockedAudioRecorder.stopRecording.mockReset();
      // Reset app state if necessary, though app is new for each test run due to describe/beforeEach structure
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
      await app.init(); // Ensure app is initialized

      await app.toggleRecording();

      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: 'Audio recording is not supported in this browser.',
      }));
      expect(MockedAudioRecorder.startRecording).not.toHaveBeenCalled();
    });

    it('should start recording successfully', async () => {
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(false); // Not currently recording
      MockedAudioRecorder.startRecording.mockResolvedValue(true); // Successful start

      // Set some initial content to ensure it's cleared
      mockTranscriptionArea.value = 'previous transcript';
      mockPolishedNoteArea.textContent = 'previous polished note';
      // Directly setting app's private members for test setup, if absolutely necessary and no other way
      // (app as any).currentTranscript = 'previous transcript';
      // (app as any).transcriptBuffer = 'previous buffer';

      await app.init(); // Ensure app is initialized
      await app.toggleRecording();

      expect(MockedAudioRecorder.startRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(true); // Accessing private state for test
      // Check that UI is cleared
      expect(mockTranscriptionArea.value).toBe('');
      expect(mockPolishedNoteArea.textContent).toBe('');
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'info',
        title: 'Recording Started',
      }));
    });

    it('should show error if starting a recording fails', async () => {
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(false);
      MockedAudioRecorder.startRecording.mockResolvedValue(false); // Failed start
      await app.init(); // Ensure app is initialized

      await app.toggleRecording();

      expect(MockedAudioRecorder.startRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(false); // Accessing private state
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Recording Failed',
      }));
    });

    it('should stop recording successfully with a transcript, and attempt polishing', async () => {
      await app.init();
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(true); // Currently recording
      // Simulate stopRecording providing a transcript.
      // The actual app logic for transcript processing from stopRecording is more via onTranscriptAvailable,
      // but toggleRecording itself directly uses the (now empty) return from stopRecording and then
      // currentTranscript (which should have been populated by onTranscriptAvailable).
      // For this test, we'll assume currentTranscript is set correctly before polish is called.
      // The crucial part is that polishCurrentTranscription is called if currentTranscript is truthy.
      MockedAudioRecorder.stopRecording.mockImplementation(async () => {
        // Simulate that by the time stopRecording is done, a transcript was made available
        // and processed by onTranscriptAvailable callback, setting app's currentTranscript.
        (app as any).currentTranscript = "mock raw transcript";
        (app as any).transcriptBuffer = "mock raw transcript"; // Ensure buffer also has it
        return "mock raw transcript"; // Though this direct return value isn't heavily used by app logic for transcript content
      });

      const polishSpy = jest.spyOn(app as any, 'polishCurrentTranscription').mockResolvedValue(undefined);

      await app.toggleRecording();

      expect(MockedAudioRecorder.stopRecording).toHaveBeenCalled();
      expect((app as any).state.isRecording).toBe(false);
      expect(polishSpy).toHaveBeenCalledWith(); // polishCurrentTranscription uses this.currentTranscript internaly
      // To check the transcript value, we'd ideally have spied on what this.currentTranscript was set to.
      // Given the setup, we trust currentTranscript was "mock raw transcript" when polishSpy was called.
      // A more direct check on the argument would require polishSpy to be called with it,
      // but polishCurrentTranscription doesn't take an argument.

      // Check toast for recording complete (polish may show its own toasts later)
      expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Recording Complete',
      }));

      // UI might show "Processing..." if polish is called, then "Start Recording" or "Polished"
      // For this test, we at least expect it not to be "Stop Recording"
      // A specific state depends on whether polishCurrentTranscription immediately updates UI or awaits.
      // Given polishSpy is mockResolvedValue(undefined), it resolves quickly.
      // The finally block in polishCurrentTranscription calls updateUI.
      // updateUI when not recording and not processing should set recordButton to "Start Recording".
      expect(mockRecordButton.textContent).toBe('Start Recording'); // After mocked polish resolves and UI updates

      polishSpy.mockRestore();
    });

    it('should stop recording successfully with NO transcript, and not attempt polishing', async () => {
      await app.init();
      MockedAudioRecorder.isSupported.mockReturnValue(true);
      MockedAudioRecorder.getIsRecording.mockReturnValue(true); // Currently recording
      MockedAudioRecorder.stopRecording.mockImplementation(async () => {
        (app as any).currentTranscript = ""; // Ensure no transcript
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
});
