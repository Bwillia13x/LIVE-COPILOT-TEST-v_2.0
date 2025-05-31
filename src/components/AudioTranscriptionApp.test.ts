import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// AudioTranscriptionApp is imported dynamically in beforeEach
import { RecordingState, AppState, Note, StoredNote, ToastOptions, ChartConfig } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

// Module-scoped variables for mocks
let mockApiServiceInstance: any;
let mockChartManagerInstance: any;
let mockDataProcessorStatic: any;
let mockAudioRecorderInstance: any;
let mockPerformanceMonitorInstance: any;
let mockIntervalManagerInstance: any;
let mockBundleOptimizerInstance: any;
let mockProductionMonitorInstance: any;
let mockHealthCheckServiceInstance: any;
let mockErrorHandlerLogError: import('vitest').SpyInstance;
let mockMemoryManagerCleanup: import('vitest').SpyInstance;
let mockErrorHandlerGetInstance: import('vitest').SpyInstance;
let mockMemoryManagerGetInstance: import('vitest').SpyInstance;

const mockActualChartPayload = {
  topics: { labels: ['topicA'], data: [10] },
  sentiment: { labels: ['positive'], data: [0.8] },
  wordFrequency: { labels: ['wordA'], data: [5] }
};
const mockActualSampleChartPayload = {
  topics: { labels: ['s_topicA'], data: [11] },
  sentiment: { labels: ['s_positive'], data: [0.9] },
  wordFrequency: { labels: ['s_wordB'], data: [8] }
};

let appTranscriptAvailableCallback: ((transcript: string) => void) | undefined;
let appRecordingStateChangeCallback: ((state: RecordingState) => void) | undefined;
let capturedIntervalManagerTasks: Record<string, { taskName: string, interval: number, callback: () => void, options?: any }> = {};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    // Helper to inspect store for debugging if needed, not used by app
    // _getStore: () => store,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

vi.stubGlobal('Blob', vi.fn((content, options) => ({ content, options, size: (content && content[0]) ? content[0].length : 0 })));
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:http://localhost/mock-url'), revokeObjectURL: vi.fn() });

describe('AudioTranscriptionApp', () => {
  let AudioTranscriptionAppModule: typeof import('./AudioTranscriptionApp');
  let app: import('./AudioTranscriptionApp').AudioTranscriptionApp; // Main app instance for most tests

  // Spies on console and app methods, set up in main beforeEach
  let showToastSpy: import('vitest').SpyInstance;
  let consoleLogSpy: import('vitest').SpyInstance;
  let consoleErrorSpy: import('vitest').SpyInstance;
  let consoleWarnSpy: import('vitest').SpyInstance;
  let updateUISpy: import('vitest').SpyInstance;
  let updatePolishedNoteAreaSpy: import('vitest').SpyInstance;
  let updateNotesDisplaySpy: import('vitest').SpyInstance;
  let updateTranscriptionAreaSpy: import('vitest').SpyInstance;
  let updateRecordingUISpy: import('vitest').SpyInstance;
  let windowAddEventListenerSpy: import('vitest').SpyInstance;

  const setupDOM = () => {
    document.body.innerHTML = `
      <button id="recordButton"></button> <div id="rawTranscription"></div> <div id="polishedNote"></div>
      <div id="recordingStatus"></div> <input id="apiKeyInput" />
      <div id="settingsModal" style="display: none;"></div> <button id="settingsButton"></button>
      <button id="closeSettingsModal"></button> <button id="cancelSettings"></button> <button id="saveSettings"></button>
      <input id="rememberApiKey" type="checkbox" /> <button id="testChartButton"></button>
      <button id="sampleChartsButton"></button> <button id="newButton"></button>
      <div class="tab-navigation"><button class="tab-button" data-tab="note"></button><button class="tab-button" data-tab="raw"></button><div class="active-tab-indicator"></div></div>
      <button id="confirmExport"></button> <button id="themeToggleButton"><i></i></button>
      <div id="performanceIndicator" style="display: none;"><span id="memoryUsage"></span><span id="cpuUsage"></span><span id="frameRate"></span><div id="performanceAlert" style="display: none;"><span id="performanceAlertText"></span></div></div>
      <button id="performanceToggleButton"></button> <div id="notesContainer"></div>
      <div id="aiChartDisplayArea"></div> <div id="app"></div> <div class="processing-indicator" style="display: none;"></div>
      <body class=""></body>
    `;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
    setupDOM();

    vi.clearAllMocks();

    mockApiServiceInstance = {
      setApiKey: vi.fn(), testConnection: vi.fn().mockResolvedValue({ success: true }),
      polishTranscription: vi.fn().mockResolvedValue({ success: true, data: 'polished text' }),
      generateChartData: vi.fn().mockResolvedValue(mockActualChartPayload),
      generateSampleChartData: vi.fn().mockResolvedValue(mockActualSampleChartPayload),
      hasValidApiKey: vi.fn(() => true),
    };
    mockChartManagerInstance = { createChart: vi.fn(), destroyAllCharts: vi.fn(), resizeAllCharts: vi.fn() };
    mockDataProcessorStatic = {
      saveNote: vi.fn(), getAllNotes: vi.fn().mockReturnValue([]), deleteNote: vi.fn().mockReturnValue(true),
      exportNotes: vi.fn().mockReturnValue('exported data'), generateTitle: vi.fn((text: string) => text ? text.substring(0, 30) : 'Untitled Note'),
      analyzeTranscription: vi.fn().mockReturnValue({ wordCount: 0, characterCount: 0, estimatedReadingTime: 0, keyPhrases: [] }),
      clearAllNotes: vi.fn(),
    };
    appTranscriptAvailableCallback = undefined; appRecordingStateChangeCallback = undefined;
    mockAudioRecorderInstance = {
      startRecording: vi.fn().mockResolvedValue(true), stopRecording: vi.fn(), pauseRecording: vi.fn(), resumeRecording: vi.fn(),
      isSupported: vi.fn(() => true), onTranscriptAvailable: vi.fn((cb) => { appTranscriptAvailableCallback = cb; }),
      onRecordingStateChange: vi.fn((cb) => { appRecordingStateChangeCallback = cb; }),
      formatDuration: vi.fn((d) => `${Math.floor(d/1000)}s`), cleanup: vi.fn(),
      getState: vi.fn().mockReturnValue({ isRecording: false, isPaused: false, duration: 0, startTime: null }),
    };
    capturedIntervalManagerTasks = {};
    mockIntervalManagerInstance = {
      createRecurringTask: vi.fn((name, _int, cb, opts) => { capturedIntervalManagerTasks[name] = { taskName: name, interval: _int, callback: cb, options: opts }; return Math.random(); }),
      clearInterval: vi.fn(), cleanup: vi.fn(),
    };
    mockPerformanceMonitorInstance = {
      startMonitoring: vi.fn(), measureOperation: vi.fn(async (fn) => typeof fn === 'function' ? await fn() : Promise.resolve(fn)),
      cleanup: vi.fn(), getLatestMetrics: vi.fn().mockReturnValue({ memoryUsage: 10, cpuUsage: 5, frameRate: 60, jsHeapSizeLimit: 2000, totalJSHeapSize: 1000, usedJSHeapSize: 500 }),
      getRecentOperations: vi.fn().mockReturnValue([]), getAlerts: vi.fn().mockReturnValue([]),
    };
    mockBundleOptimizerInstance = { registerLazyModule: vi.fn(), loadCriticalModules: vi.fn().mockResolvedValue(undefined), cleanup: vi.fn() };
    mockProductionMonitorInstance = { trackEvent: vi.fn(), trackError: vi.fn() };
    mockHealthCheckServiceInstance = { getHealthStatus: vi.fn().mockResolvedValue({ status: 'healthy', checks: {} }) };

    mockErrorHandlerLogError = vi.fn(); // Initialize spy here
    mockErrorHandlerGetInstance = vi.fn(() => ({ handleAppError: vi.fn() }));
    mockMemoryManagerCleanup = vi.fn();
    mockMemoryManagerGetInstance = vi.fn(() => ({ cleanup: vi.fn() }));

    vi.doMock('../services/APIService', () => ({ APIService: vi.fn(() => mockApiServiceInstance) }));
    vi.doMock('../services/ChartManager', () => ({ ChartManager: vi.fn(() => mockChartManagerInstance) }));
    vi.doMock('../services/DataProcessor', () => ({ DataProcessor: mockDataProcessorStatic }));
    vi.doMock('../services/AudioRecorder', () => ({ AudioRecorder: vi.fn(() => mockAudioRecorderInstance) }));
    vi.doMock('../services/PerformanceMonitor', () => ({ PerformanceMonitor: { getInstance: vi.fn(() => mockPerformanceMonitorInstance) } }));
    vi.doMock('../services/IntervalManager', () => ({ IntervalManager: { getInstance: vi.fn(() => mockIntervalManagerInstance) } }));
    vi.doMock('../services/BundleOptimizer', () => ({ BundleOptimizer: { getInstance: vi.fn(() => mockBundleOptimizerInstance) } }));
    vi.doMock('../services/ProductionMonitor', () => ({ ProductionMonitor: { getInstance: vi.fn(() => mockProductionMonitorInstance) } }));
    vi.doMock('../services/HealthCheckService', () => ({ HealthCheckService: { getInstance: vi.fn(() => mockHealthCheckServiceInstance) } }));

    vi.doMock('../utils', async (importActual) => {
        const actualUtils = await importActual() as any;
        return {
            ...actualUtils,
            ErrorHandler: {
                getInstance: mockErrorHandlerGetInstance,
                logError: mockErrorHandlerLogError
            },
            MemoryManager: {
                getInstance: mockMemoryManagerGetInstance,
                cleanup: mockMemoryManagerCleanup
            }
        };
    });

    windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

    AudioTranscriptionAppModule = await import('./AudioTranscriptionApp');
    app = new AudioTranscriptionAppModule.AudioTranscriptionApp(); // Main app instance

    // Global console spies, attached after app init to capture app's logs primarily
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Spies on app instance methods
    showToastSpy = vi.spyOn(app as any, 'showToast').mockImplementation(() => {});
    updateUISpy = vi.spyOn(app as any, 'updateUI').mockImplementation(() => {});
    updatePolishedNoteAreaSpy = vi.spyOn(app as any, 'updatePolishedNoteArea').mockImplementation(() => {});
    updateNotesDisplaySpy = vi.spyOn(app as any, 'updateNotesDisplay').mockImplementation(() => {});
    updateTranscriptionAreaSpy = vi.spyOn(app as any, 'updateTranscriptionArea').mockImplementation(() => {});
    updateRecordingUISpy = vi.spyOn(app as any, 'updateRecordingUI').mockImplementation(() => {});

    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Constructor and Initialization (initializeApp)', () => {
    it('should call all core initialization methods during app instantiation', () => {
      expect(mockPerformanceMonitorInstance.startMonitoring).toHaveBeenCalled();
      const logCallFound = consoleLogSpy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.includes('Audio Transcription App initialized successfully'))
      );
      expect(logCallFound).withContext("Expected console.log to contain 'Audio Transcription App initialized successfully'").toBe(true);
    });

    it('should handle errors during initializeApp and show a toast', async () => {
      vi.resetModules();
      const localMockErrorHandlerLogError = vi.fn(); // Local spy for this test
      vi.doMock('../utils', () => ({ ErrorHandler: { logError: localMockErrorHandlerLogError, getInstance: vi.fn() }, MemoryManager: { cleanup: vi.fn(), getInstance: vi.fn() } }));

      const TempAppModule = await import('./AudioTranscriptionApp');
      const errorAppProto = TempAppModule.AudioTranscriptionApp.prototype as any;
      const originalSetupDOMReferences = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Test DOM setup failed'); });

      let testErrorApp: any;
      let testShowToastSpy = vi.fn();
      try {
        testErrorApp = new TempAppModule.AudioTranscriptionApp();
        vi.spyOn(testErrorApp as any, 'showToast').mockImplementation(testShowToastSpy);
        await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();
      } finally {
        errorAppProto.setupDOMReferences = originalSetupDOMReferences;
      }
      expect(localMockErrorHandlerLogError).toHaveBeenCalledWith('Failed to initialize app', expect.objectContaining({ message: 'Test DOM setup failed' }));
      expect(testShowToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Initialization Error'}));
    });
  });

  describe('setupDOMReferences Specific Tests', () => {
    it('should correctly assign DOM elements to app.elements', () => {
      expect((app as any).elements.recordButton).toBeInstanceOf(HTMLButtonElement);
    });
    it('should not throw error if a required DOM element is missing (error handled by initializeApp)', async () => {
      document.body.innerHTML = '<div id="app"></div>';
      vi.resetModules();
      const localMockErrorHandlerLogError = vi.fn();
      vi.doMock('../utils', () => ({ ErrorHandler: { logError: localMockErrorHandlerLogError, getInstance: vi.fn() }, MemoryManager: { cleanup: vi.fn(), getInstance: vi.fn() } }));
      const TempAppModule = await import('./AudioTranscriptionApp');
      const errorAppProto = TempAppModule.AudioTranscriptionApp.prototype as any;
      const originalSetupDOM = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Required element missing test'); });
      let errorTestApp: any; let localShowToastSpy = vi.fn();
      try {
        errorTestApp = new TempAppModule.AudioTranscriptionApp();
        vi.spyOn(errorTestApp as any, 'showToast').mockImplementation(localShowToastSpy);
        await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();
      } finally { errorAppProto.setupDOMReferences = originalSetupDOM; }
      expect(localShowToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Initialization Error' }));
    });
  });

  describe('setupEventListeners Specific Tests', () => {
    it('should add expected window event listeners', () => {
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('initializeAPIKey Specific Tests', () => {
    it('should set API key from localStorage and update UI elements if key exists', async () => {
      // Setup localStorage for this specific test case
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn((key: string) => key === 'geminiApiKey' ? 'ls-test-key-init' : null);

      vi.resetModules();
      const tempMockApiService = { setApiKey: vi.fn(), testConnection: vi.fn().mockResolvedValue({ success: true }), polishTranscription: vi.fn(), generateChartData: vi.fn(), generateSampleChartData: vi.fn(), hasValidApiKey: vi.fn() };
      vi.doMock('../services/APIService', () => ({ APIService: vi.fn(() => tempMockApiService) }));
      vi.doMock('../utils', () => ({ ErrorHandler: { logError: vi.fn(), getInstance: vi.fn() }, MemoryManager: { cleanup: vi.fn(), getInstance: vi.fn() } }));

      const localAppModule = await import('./AudioTranscriptionApp');
      const localApp = new localAppModule.AudioTranscriptionApp();
      vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();

      expect(tempMockApiService.setApiKey).toHaveBeenCalledWith('ls-test-key-init');
      localStorageMock.getItem = originalGetItem; // Restore original mock behavior
    });

    it('should log message if no API key in localStorage', async () => {
      // Ensure localStorage.getItem returns null for 'geminiApiKey' FOR THIS TEST
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn((key: string) => key === 'geminiApiKey' ? null : (originalGetItem(key)));

      // Local console spy for this specific test to avoid interference
      const localConsoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.resetModules(); // Reset modules to ensure fresh App construction with this specific localStorage state
      // Re-mock dependencies that might log during init
      vi.doMock('../services/HealthCheckService', () => ({ HealthCheckService: { getInstance: () => ({ getHealthStatus: vi.fn().mockResolvedValue({status: 'healthy'}) }) }}));
      vi.doMock('../services/PerformanceMonitor', () => ({ PerformanceMonitor: { getInstance: () => ({ startMonitoring: vi.fn()}) }}));

      const LocalAppModule = await import('./AudioTranscriptionApp');
      const localApp = new LocalAppModule.AudioTranscriptionApp();
      await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve(); // Allow initializeApp to run

      const expectedMessage = '⚠️ No API key found in localStorage - user will need to configure one';
      const logCallFound = localConsoleLogSpy.mock.calls.some(callArgs =>
        callArgs.some(arg => typeof arg === 'string' && arg.includes(expectedMessage))
      );

      // console.log('All console.log calls captured by local spy for this test:', JSON.stringify(localConsoleLogSpy.mock.calls, null, 2));

      expect(logCallFound)
        .withContext(`Expected console.log to contain '${expectedMessage}'. Actual calls: ${JSON.stringify(localConsoleLogSpy.mock.calls)}`)
        .toBe(true);

      localConsoleLogSpy.mockRestore();
      localStorageMock.getItem = originalGetItem; // Restore original mock behavior
    });
  });

  describe('initTheme Specific Tests', () => {
    it('should apply theme from localStorage if present', async () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn((key: string) => key === 'voice-notes-theme' ? 'light' : null);
      vi.resetModules();
      vi.doMock('../utils', () => ({ ErrorHandler: { logError: vi.fn(), getInstance: vi.fn() }, MemoryManager: { cleanup: vi.fn(), getInstance: vi.fn() } }));
      const localAppModule = await import('./AudioTranscriptionApp');
      const localApp = new localAppModule.AudioTranscriptionApp();
      vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();
      expect(document.body.className).toBe('light-mode');
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('setupAudioRecorder Specific Tests', () => {
    it('should register callbacks with the AudioRecorder instance', () => {
      expect(appTranscriptAvailableCallback).toBeTypeOf('function');
      expect(appRecordingStateChangeCallback).toBeTypeOf('function');
    });
  });

  describe('Core Functionality Methods', () => {
    describe('toggleRecording()', () => {
      it('when not recording, and supported, and start is successful, should start recording', async () => {
        const appAudioRecorder = (app as any).audioRecorder;
        vi.spyOn(appAudioRecorder, 'isSupported').mockReturnValueOnce(true);
        const startRecordingSpy = vi.spyOn(appAudioRecorder, 'startRecording').mockResolvedValueOnce(true);
        await app.toggleRecording();
        expect(startRecordingSpy).toHaveBeenCalled();
      });
      it('when recording, should stop recording', async () => {
        const appAudioRecorder = (app as any).audioRecorder;
        const stopRecordingSpy = vi.spyOn(appAudioRecorder, 'stopRecording');
        (app as any).state.isRecording = true; (app as any).transcriptBuffer = "text";
        await app.toggleRecording();
        expect(stopRecordingSpy).toHaveBeenCalled();
      });
    });
    describe('polishCurrentTranscription()', () => {
      it('should successfully polish and update UI', async () => {
        (app as any).currentTranscript = 'raw text';
        vi.mocked(mockApiServiceInstance.polishTranscription).mockResolvedValueOnce({ success: true, data: 'Newly polished text' });
        await app.polishCurrentTranscription();
        expect(updatePolishedNoteAreaSpy).toHaveBeenCalled();
      });
    });
    describe('saveCurrentNote()', () => {
      it('should save current note and update display', () => {
        (app as any).state.currentNote = { id: 's1', rawTranscription: 'r', polishedNote: 'p', timestamp: 0 };
        app.saveCurrentNote();
        expect(mockDataProcessorStatic.saveNote).toHaveBeenCalled();
      });
    });
    describe('clearCurrentNote()', () => {
      it('should clear relevant data and update UI', () => {
        app.clearCurrentNote();
        expect(mockChartManagerInstance.destroyAllCharts).toHaveBeenCalled();
      });
    });
    describe('generateCharts()', () => {
      it('should call API and create charts', async () => {
        (app as any).fullTranscription = "chart data";
        await app.generateCharts();
        expect(mockApiServiceInstance.generateChartData).toHaveBeenCalledWith("chart data");
        expect(mockChartManagerInstance.createChart).toHaveBeenCalledWith('topicsChart', mockActualChartPayload.topics, undefined);
        expect(mockChartManagerInstance.createChart).toHaveBeenCalledWith('sentimentChart', mockActualChartPayload.sentiment, undefined);
      });
    });
    describe('generateSampleCharts()', () => {
      it('should call API and create sample charts', async () => {
        await app.generateSampleCharts();
        expect(mockApiServiceInstance.generateSampleChartData).toHaveBeenCalled();
        expect(mockChartManagerInstance.createChart).toHaveBeenCalledWith('topicsChart', mockActualSampleChartPayload.topics, undefined);
      });
    });
    describe('exportNotes()', () => {
      it('should call DataProcessor.exportNotes and trigger download', () => {
        app.exportNotes();
        expect(mockDataProcessorStatic.exportNotes).toHaveBeenCalled();
        expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalled();
      });
    });
  });

  describe('State Management & Callbacks', () => {
    let transcriptCallback: ((transcript: string) => void) | undefined;
    let stateChangeCallback: ((state: RecordingState) => void) | undefined;
    beforeEach(() => {
      transcriptCallback = appTranscriptAvailableCallback;
      stateChangeCallback = appRecordingStateChangeCallback;
    });
    describe('AudioRecorder onTranscriptAvailable Callback', () => {
      it('should update transcriptBuffer and call updateTranscriptionArea', () => {
        expect(transcriptCallback).toBeDefined();
        if (transcriptCallback) transcriptCallback('Hello world');
        expect((app as any).transcriptBuffer).toBe('Hello world ');
        expect(updateTranscriptionAreaSpy).toHaveBeenCalled();
      });
      it('should accumulate transcripts in transcriptBuffer', () => {
        expect(transcriptCallback).toBeDefined();
        if (transcriptCallback) {
            (app as any).transcriptBuffer = '';
            transcriptCallback('First part.');
            expect((app as any).transcriptBuffer).toBe('First part. ');
            transcriptCallback('Second part.');
            expect((app as any).transcriptBuffer).toBe('First part. Second part. ');
            expect(updateTranscriptionAreaSpy).toHaveBeenCalledTimes(2);
        }
      });
    });
    describe('AudioRecorder onRecordingStateChange Callback', () => {
      it('should call updateRecordingUI with new recording state', () => {
        expect(stateChangeCallback).toBeDefined();
        const newState: RecordingState = { isRecording: true, isPaused: false, duration: 1000, startTime: Date.now() };
        if (stateChangeCallback) stateChangeCallback(newState);
        expect(updateRecordingUISpy).toHaveBeenCalledWith(newState);
      });
    });
  });

  describe('Helper and Lifecycle Methods', () => {
    it('cleanup should call cleanup methods of services and clear intervals', () => {
      (app as any).autoSaveInterval = 111; (app as any).uiUpdateInterval = 222;
      const appAudioRecorder = (app as any).audioRecorder;
      const cleanupSpyAR = vi.spyOn(appAudioRecorder, 'cleanup');
      const globalClearIntervalSpy = vi.spyOn(window, 'clearInterval');
      app.cleanup();
      expect(globalClearIntervalSpy).toHaveBeenCalledWith(111);
      expect(cleanupSpyAR).toHaveBeenCalled();
      globalClearIntervalSpy.mockRestore();
    });
    it('registerLazyModules should register expected modules', () => {
      expect(mockBundleOptimizerInstance.registerLazyModule).toHaveBeenCalledWith('charting', expect.any(Function));
    });
    describe('setupAutoSave callback', () => {
      let autoSaveCallback: () => void | undefined;
      beforeEach(() => {
        const autoSaveTask = capturedIntervalManagerTasks['AutoSave'];
        expect(autoSaveTask).toBeDefined(); autoSaveCallback = autoSaveTask?.callback;
        expect(autoSaveCallback).toBeTypeOf('function');
      });
      it('should save note if currentNote exists and not processing', () => {
        if (!autoSaveCallback) return;
        (app as any).state.currentNote = { id: 'a' }; (app as any).state.isProcessing = false;
        autoSaveCallback(); expect(mockDataProcessorStatic.saveNote).toHaveBeenCalled();
      });
    });
    describe('setupPeriodicUpdates callback', () => {
      it('should call updatePerformanceUI', () => {
        const spy = vi.spyOn(app as any, 'updatePerformanceUI');
        const task = capturedIntervalManagerTasks['UIUpdate'];
        expect(task?.callback).toBeTypeOf('function');
        if (task?.callback) task.callback();
        expect(spy).toHaveBeenCalled(); spy.mockRestore();
      });
    });
    describe('updatePerformanceUI', () => {
      it('should show alert if critical alerts exist and indicator is visible', () => {
        document.getElementById('performanceIndicator')!.style.display = 'block';
        vi.mocked(mockPerformanceMonitorInstance.getAlerts).mockReturnValueOnce([{ severity: 'critical', message: 'High memory!' }]);
        (app as any).updatePerformanceUI();
        expect(document.getElementById('performanceAlertText')!.textContent).toBe('High memory!');
      });
    });
  });
});
