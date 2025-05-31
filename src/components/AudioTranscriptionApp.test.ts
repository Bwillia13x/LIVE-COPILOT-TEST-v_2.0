import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// REMOVE: import { AudioTranscriptionApp } from './AudioTranscriptionApp';
import { RecordingState, AppState, Note, StoredNote, ToastOptions, ChartConfig } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

// Module-scoped variables for mocks that need to be accessed by tests or across beforeEach/afterEach
// These will be instances of the mocked services, configured in beforeEach.
let mockApiServiceInstance: any;
let mockChartManagerInstance: any;
let mockDataProcessorStatic: any; // For static class DataProcessor
let mockAudioRecorderInstance: any;
let mockPerformanceMonitorInstance: any;
let mockIntervalManagerInstance: any;
let mockBundleOptimizerInstance: any;
let mockProductionMonitorInstance: any;
let mockHealthCheckServiceInstance: any;
let mockErrorHandlerStatic: any; // For ErrorHandler static methods
let mockMemoryManagerStatic: any; // For MemoryManager static methods

// Payloads for chart data, defined here to be accessible in beforeEach for APIService mock
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

// Variables to capture callbacks
let appTranscriptAvailableCallback: ((transcript: string) => void) | undefined;
let appRecordingStateChangeCallback: ((state: RecordingState) => void) | undefined;
let capturedIntervalManagerTasks: Record<string, { taskName: string, interval: number, callback: () => void, options?: any }> = {};

// --- Global Mocks ---
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

vi.stubGlobal('Blob', vi.fn((content, options) => ({ content, options, size: (content && content[0]) ? content[0].length : 0 })));
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:http://localhost/mock-url'), revokeObjectURL: vi.fn() });

describe('AudioTranscriptionApp', () => {
  let AudioTranscriptionAppModule: typeof import('./AudioTranscriptionApp');
  let app: import('./AudioTranscriptionApp').AudioTranscriptionApp;

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

    // --- Define/Reset all mock instances and their methods ---
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
    mockErrorHandlerStatic = { getInstance: vi.fn(() => ({ handleAppError: vi.fn() })), logError: vi.fn() };
    mockMemoryManagerStatic = { getInstance: vi.fn(() => ({ cleanup: vi.fn() })), cleanup: vi.fn() };

    // --- Apply mocks using vi.doMock ---
    vi.doMock('../services/APIService', () => ({ APIService: vi.fn(() => mockApiServiceInstance) }));
    vi.doMock('../services/ChartManager', () => ({ ChartManager: vi.fn(() => mockChartManagerInstance) }));
    vi.doMock('../services/DataProcessor', () => ({ DataProcessor: mockDataProcessorStatic }));
    vi.doMock('../services/AudioRecorder', () => ({ AudioRecorder: vi.fn(() => mockAudioRecorderInstance) }));
    vi.doMock('../services/PerformanceMonitor', () => ({ PerformanceMonitor: { getInstance: vi.fn(() => mockPerformanceMonitorInstance) } }));
    vi.doMock('../services/IntervalManager', () => ({ IntervalManager: { getInstance: vi.fn(() => mockIntervalManagerInstance) } }));
    vi.doMock('../services/BundleOptimizer', () => ({ BundleOptimizer: { getInstance: vi.fn(() => mockBundleOptimizerInstance) } }));
    vi.doMock('../services/ProductionMonitor', () => ({ ProductionMonitor: { getInstance: vi.fn(() => mockProductionMonitorInstance) } }));
    vi.doMock('../services/HealthCheckService', () => ({ HealthCheckService: { getInstance: vi.fn(() => mockHealthCheckServiceInstance) } }));
    vi.doMock('../utils', () => ({ ErrorHandler: mockErrorHandlerStatic, MemoryManager: mockMemoryManagerStatic }));

    // --- Spy on window.addEventListener BEFORE app instantiation ---
    if (windowAddEventListenerSpy) windowAddEventListenerSpy.mockRestore();
    windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

    // --- Dynamically import and instantiate app ---
    AudioTranscriptionAppModule = await import('./AudioTranscriptionApp');
    app = new AudioTranscriptionAppModule.AudioTranscriptionApp();

    // --- Clear mocks that might have been called during instantiation ---
    // (e.g. setApiKey might be called if localStorage has a key)
    Object.values(mockApiServiceInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockChartManagerInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockDataProcessorStatic).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockAudioRecorderInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockPerformanceMonitorInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockIntervalManagerInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    // ... and so on for other service instances

    localStorageMock.clear.mockClear(); // Clear call count for localStorage.clear
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    vi.mocked(URL.createObjectURL).mockClear();
    mockErrorHandlerStatic.logError.mockClear();


    // --- Console and App method spies ---
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (consoleWarnSpy) consoleWarnSpy.mockRestore();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    if (showToastSpy) showToastSpy.mockRestore();
    showToastSpy = vi.spyOn(app as any, 'showToast').mockImplementation(() => {});
    // ... other app method spies ...
    updateUISpy = vi.spyOn(app as any, 'updateUI').mockImplementation(() => {});
    updatePolishedNoteAreaSpy = vi.spyOn(app as any, 'updatePolishedNoteArea').mockImplementation(() => {});
    updateNotesDisplaySpy = vi.spyOn(app as any, 'updateNotesDisplay').mockImplementation(() => {});
    updateTranscriptionAreaSpy = vi.spyOn(app as any, 'updateTranscriptionArea').mockImplementation(() => {});
    updateRecordingUISpy = vi.spyOn(app as any, 'updateRecordingUI').mockImplementation(() => {});


    // --- Wait for initializeApp to complete its async operations ---
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules(); // Crucial for vi.doMock
    vi.restoreAllMocks(); // This will restore spies including windowAddEventListenerSpy
    document.body.innerHTML = '';
  });

  // --- TESTS START HERE ---
  describe('Constructor and Initialization (initializeApp)', () => {
    it('should call all core initialization methods during app instantiation', () => {
      expect(mockPerformanceMonitorInstance.startMonitoring).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('🎙️ Audio Transcription App initialized successfully');
    });

    it('should handle errors during initializeApp and show a toast', async () => {
      // For this test, we need to re-setup mocks and import to control an error
      vi.resetModules(); // Reset modules to re-import app with specific error
      const errorAppProto = (await import('./AudioTranscriptionApp')).AudioTranscriptionApp.prototype as any;
      const originalSetupDOM = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Test DOM setup failed'); });

      let testErrorApp: any;
      let testShowToastSpy: any;
      try {
        testErrorApp = new (await import('./AudioTranscriptionApp')).AudioTranscriptionApp();
        testShowToastSpy = vi.spyOn(testErrorApp as any, 'showToast');
        await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();
      } finally {
        errorAppProto.setupDOMReferences = originalSetupDOM;
      }
      expect(mockErrorHandlerStatic.logError).toHaveBeenCalledWith('Failed to initialize app', expect.objectContaining({ message: 'Test DOM setup failed' }));
      if (testShowToastSpy) expect(testShowToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Initialization Error' }));
    });
  });

  describe('setupDOMReferences Specific Tests', () => {
    it('should correctly assign DOM elements to app.elements', () => {
      expect((app as any).elements.recordButton).toBeInstanceOf(HTMLButtonElement);
    });
    it('should not throw error if a required DOM element is missing (error handled by initializeApp)', async () => {
      document.body.innerHTML = '<div id="app"></div>';
      vi.resetModules();
      const errorAppProto = (await import('./AudioTranscriptionApp')).AudioTranscriptionApp.prototype as any;
      const originalSetupDOM = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Required element missing test'); });
      let errorTestApp: any; let localShowToastSpy = vi.fn();
      try {
        errorTestApp = new (await import('./AudioTranscriptionApp')).AudioTranscriptionApp();
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
      localStorageMock.setItem('geminiApiKey', 'ls-test-key-init');
      vi.resetModules(); // Reset to re-import app and re-run its init
      const localAppModule = await import('./AudioTranscriptionApp');
      const localApp = new localAppModule.AudioTranscriptionApp();
      vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();

      expect(mockApiServiceInstance.setApiKey).toHaveBeenCalledWith('ls-test-key-init');
    });
    it('should log message if no API key in localStorage', () => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No API key found in localStorage'));
    });
  });

  describe('initTheme Specific Tests', () => {
    it('should apply theme from localStorage if present', async () => {
      localStorageMock.setItem('voice-notes-theme', 'light');
      vi.resetModules();
      const localAppModule = await import('./AudioTranscriptionApp');
      const localApp = new localAppModule.AudioTranscriptionApp();
      vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync(); await Promise.resolve(); await Promise.resolve();
      expect(document.body.className).toBe('light-mode');
    });
  });

  describe('setupAudioRecorder Specific Tests', () => {
    it('should register callbacks with the AudioRecorder instance', () => {
      expect(appTranscriptAvailableCallback).toBeTypeOf('function');
      expect(appRecordingStateChangeCallback).toBeTypeOf('function');
    });
  });

  describe('Core Functionality Methods', () => {
    // Tests use the `app` instance from the main beforeEach
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
        (app as any).state.currentNote = { id: 's1', r: '', p: '', t: 0 };
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
            (app as any).transcriptBuffer = ''; // Reset for this test
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
