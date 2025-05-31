import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioTranscriptionApp } from './AudioTranscriptionApp';
// Import types for state, etc., if needed for assertions
import { RecordingState, AppState, Note, StoredNote, ToastOptions } from '../types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

// --- Mock Services ---
vi.mock('../services/APIService', () => {
  const instance = {
    setApiKey: vi.fn(),
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    polishTranscription: vi.fn().mockResolvedValue({ success: true, data: 'polished text' }),
    generateChartData: vi.fn().mockResolvedValue({ success: true, data: {} }),
    generateSampleChartData: vi.fn().mockResolvedValue({ success: true, data: {} }),
    hasValidApiKey: vi.fn(() => true),
  };
  return { APIService: vi.fn(() => instance) };
});

vi.mock('../services/ChartManager', () => {
  const instance = {
    createChart: vi.fn(),
    destroyAllCharts: vi.fn(),
    resizeAllCharts: vi.fn(),
  };
  return { ChartManager: vi.fn(() => instance) };
});

vi.mock('../services/DataProcessor', () => ({
  DataProcessor: {
    saveNote: vi.fn(),
    getAllNotes: vi.fn().mockReturnValue([]),
    deleteNote: vi.fn().mockReturnValue(true),
    exportNotes: vi.fn().mockReturnValue('exported data'),
    generateTitle: vi.fn((text: string) => text ? text.substring(0, 30) : 'Untitled Note'),
    analyzeTranscription: vi.fn().mockReturnValue({ wordCount: 0, characterCount: 0, estimatedReadingTime: 0, keyPhrases: [] }),
    clearAllNotes: vi.fn(),
  }
}));

// Variables to capture callbacks from the AudioRecorder instance used by the app
let appTranscriptAvailableCallback: ((transcript: string) => void) | undefined;
let appRecordingStateChangeCallback: ((state: RecordingState) => void) | undefined;

vi.mock('../services/AudioRecorder', () => ({
  AudioRecorder: vi.fn(() => {
    const instance = {
      startRecording: vi.fn().mockResolvedValue(true),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      isSupported: vi.fn(() => true),
      onTranscriptAvailable: vi.fn((callback) => { appTranscriptAvailableCallback = callback; }),
      onRecordingStateChange: vi.fn((callback) => { appRecordingStateChangeCallback = callback; }),
      formatDuration: vi.fn((duration: number) => `${Math.floor(duration/1000)}s`),
      cleanup: vi.fn(),
      getState: vi.fn().mockReturnValue({ isRecording: false, isPaused: false, duration: 0, startTime: null }),
    };
    return instance;
  })
}));

// Variable to capture interval callbacks
let capturedIntervalManagerTasks: Record<string, { taskName: string, interval: number, callback: () => void, options?: any }> = {};

vi.mock('../services/PerformanceMonitor', () => {
  const instance = {
    startMonitoring: vi.fn(),
    measureOperation: vi.fn(async (fn) => typeof fn === 'function' ? await fn() : Promise.resolve(fn)),
    cleanup: vi.fn(),
    getLatestMetrics: vi.fn().mockReturnValue({ memoryUsage: 10, cpuUsage: 5, frameRate: 60, jsHeapSizeLimit: 2000, totalJSHeapSize: 1000, usedJSHeapSize: 500 }),
    getRecentOperations: vi.fn().mockReturnValue([]),
    getAlerts: vi.fn().mockReturnValue([]),
  };
  return { PerformanceMonitor: { getInstance: vi.fn(() => instance) } };
});

vi.mock('../services/IntervalManager', () => {
  const instance = {
    createRecurringTask: vi.fn((taskName, interval, callback, options) => {
      capturedIntervalManagerTasks[taskName] = { taskName, interval, callback, options };
      return Math.floor(Math.random() * 100000);
    }),
    clearInterval: vi.fn(),
    cleanup: vi.fn(),
  };
  return { IntervalManager: { getInstance: vi.fn(() => instance) } };
});

vi.mock('../services/BundleOptimizer', () => {
  const instance = {
    registerLazyModule: vi.fn(),
    loadCriticalModules: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
  };
  return { BundleOptimizer: { getInstance: vi.fn(() => instance) } };
});

vi.mock('../services/ProductionMonitor', () => {
  const instance = {
    trackEvent: vi.fn(),
    trackError: vi.fn(),
  };
  return { ProductionMonitor: { getInstance: vi.fn(() => instance) } };
});

vi.mock('../services/HealthCheckService', () => {
  const instance = {
    getHealthStatus: vi.fn().mockResolvedValue({ status: 'healthy', checks: {} }),
  };
  return { HealthCheckService: { getInstance: vi.fn(() => instance) } };
});

vi.mock('../utils', async (importOriginal) => {
  const originalUtils = await importOriginal() as any;
  return {
    ...originalUtils,
    ErrorHandler: {
      getInstance: vi.fn(() => ({
        handleAppError: vi.fn(),
      })),
      logError: vi.fn(),
    },
    MemoryManager: {
      getInstance: vi.fn(() => ({ cleanup: vi.fn() })),
      cleanup: vi.fn(),
    },
  };
});

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
  let app: AudioTranscriptionApp;
  let showToastSpy: import('vitest').SpyInstance;
  let consoleLogSpy: import('vitest').SpyInstance;
  let consoleErrorSpy: import('vitest').SpyInstance;
  let consoleWarnSpy: import('vitest').SpyInstance;
  let updateUISpy: import('vitest').SpyInstance;
  let updatePolishedNoteAreaSpy: import('vitest').SpyInstance;
  let updateNotesDisplaySpy: import('vitest').SpyInstance;
  let updateTranscriptionAreaSpy: import('vitest').SpyInstance;
  let updateRecordingUISpy: import('vitest').SpyInstance;
  let windowAddEventListenerSpy: import('vitest').SpyInstance; // Declare spy here

  // Mocks for service instances (can be typed more strictly if desired)
  let mockApiService: any;
  let mockChartManager: any;
  let mockDataProcessorRef: any;
  let MockedAudioRecorderConstructorSpy: any;
  let mockPerformanceMonitor: any;
  let mockIntervalManager: any;
  let mockBundleOptimizer: any;
  let mockProductionMonitor: any;
  let mockHealthCheckService: any;
  let MockedErrorHandler: any;


  const setupDOM = () => {
    document.body.innerHTML = `
      <button id="recordButton"></button>
      <div id="rawTranscription"></div>
      <div id="polishedNote"></div>
      <div id="recordingStatus"></div>
      <input id="apiKeyInput" />
      <div id="settingsModal" style="display: none;"></div>
      <button id="settingsButton"></button>
      <button id="closeSettingsModal"></button>
      <button id="cancelSettings"></button>
      <button id="saveSettings"></button>
      <input id="rememberApiKey" type="checkbox" />
      <button id="testChartButton"></button>
      <button id="sampleChartsButton"></button>
      <button id="newButton"></button>
      <div class="tab-navigation">
        <button class="tab-button" data-tab="note"></button>
        <button class="tab-button" data-tab="raw"></button>
        <div class="active-tab-indicator"></div>
      </div>
      <button id="confirmExport"></button>
      <button id="themeToggleButton"><i></i></button>
      <div id="performanceIndicator" style="display: none;">
        <span id="memoryUsage"></span> <span id="cpuUsage"></span> <span id="frameRate"></span>
        <div id="performanceAlert" style="display: none;"><span id="performanceAlertText"></span></div>
      </div>
      <button id="performanceToggleButton"></button>
      <div id="notesContainer"></div>
      <div id="aiChartDisplayArea"></div>
      <div id="app"></div>
      <div class="processing-indicator" style="display: none;"></div>
      <button id="advancedExportButton"></button>
      <button id="contentLibraryButton"></button>
      <button id="workflowButton"></button>
      <button id="smartSuggestionsButton"></button>
      <div id="smartSuggestionsPanel"></div>
      <div id="contentInsightsPanel"></div>
      <div id="fileDropZone"></div>
      <div id="contentLibraryPanel"></div>
      <div id="workflowPanel"></div>
      <div id="authModal"></div>
      <div id="userManagementPanel"></div>
      <div id="inviteModal"></div>
      <body class=""></body>
    `;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

    setupDOM();

    // Spy on window.addEventListener BEFORE app instantiation
    windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

    // Re-import and get instances of mocked services
    const APIServiceModule = await import('../services/APIService');
    mockApiService = new APIServiceModule.APIService() as any;
    const ChartManagerModule = await import('../services/ChartManager');
    mockChartManager = new ChartManagerModule.ChartManager() as any;
    const DataProcessorModule = await import('../services/DataProcessor');
    mockDataProcessorRef = DataProcessorModule.DataProcessor as any;

    const AudioRecorderModule = await import('../services/AudioRecorder');
    MockedAudioRecorderConstructorSpy = vi.mocked(AudioRecorderModule.AudioRecorder);

    appTranscriptAvailableCallback = undefined;
    appRecordingStateChangeCallback = undefined;

    const PerformanceMonitorModule = await import('../services/PerformanceMonitor');
    mockPerformanceMonitor = PerformanceMonitorModule.PerformanceMonitor.getInstance() as any;
    const IntervalManagerModule = await import('../services/IntervalManager');
    mockIntervalManager = IntervalManagerModule.IntervalManager.getInstance() as any;
    capturedIntervalManagerTasks = {};

    const BundleOptimizerModule = await import('../services/BundleOptimizer');
    mockBundleOptimizer = BundleOptimizerModule.BundleOptimizer.getInstance() as any;
    const ProductionMonitorModule = await import('../services/ProductionMonitor');
    mockProductionMonitor = ProductionMonitorModule.ProductionMonitor.getInstance() as any;
    const HealthCheckServiceModule = await import('../services/HealthCheckService');
    mockHealthCheckService = HealthCheckServiceModule.HealthCheckService.getInstance() as any;
    const UtilsModule = await import('../utils');
    MockedErrorHandler = UtilsModule.ErrorHandler as any;

    // Clear mocks that might be called during app instantiation or by other tests
    vi.mocked(mockApiService.setApiKey).mockClear();
    vi.mocked(mockChartManager.createChart).mockClear();
    vi.mocked(mockDataProcessorRef.saveNote).mockClear();
    MockedAudioRecorderConstructorSpy.mockClear();
    // ... clear other service method spies as needed ...

    localStorageMock.clear(); // Clear localStorage mock state
    vi.mocked(localStorageMock.getItem).mockClear();
    vi.mocked(localStorageMock.setItem).mockClear();
    vi.mocked(localStorageMock.removeItem).mockClear();

    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
    showToastSpy?.mockRestore();
    updateUISpy?.mockRestore();
    updatePolishedNoteAreaSpy?.mockRestore();
    updateNotesDisplaySpy?.mockRestore();
    updateTranscriptionAreaSpy?.mockRestore();
    updateRecordingUISpy?.mockRestore();

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    app = new AudioTranscriptionApp();

    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    showToastSpy = vi.spyOn(app as any, 'showToast').mockImplementation(() => {});
    updateUISpy = vi.spyOn(app as any, 'updateUI').mockImplementation(() => {});
    updatePolishedNoteAreaSpy = vi.spyOn(app as any, 'updatePolishedNoteArea').mockImplementation(() => {});
    updateNotesDisplaySpy = vi.spyOn(app as any, 'updateNotesDisplay').mockImplementation(() => {});
    updateTranscriptionAreaSpy = vi.spyOn(app as any, 'updateTranscriptionArea').mockImplementation(() => {});
    updateRecordingUISpy = vi.spyOn(app as any, 'updateRecordingUI').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    windowAddEventListenerSpy?.mockRestore(); // Restore the window spy
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Constructor and Initialization (initializeApp)', () => {
    it('should call all core initialization methods during app instantiation', () => {
      expect(mockPerformanceMonitor.startMonitoring).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('🎙️ Audio Transcription App initialized successfully');
    });

    it('should handle errors during initializeApp and show a toast', async () => {
      const errorAppProto = AudioTranscriptionApp.prototype as any;
      const originalSetupDOMReferences = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Test DOM setup failed'); });

      let testErrorApp: AudioTranscriptionApp | null = null;
      let testShowToastSpy: any;

      try {
        windowAddEventListenerSpy?.mockRestore(); // Prevent current spy from interfering
        testErrorApp = new AudioTranscriptionApp();
        testShowToastSpy = vi.spyOn(testErrorApp as any, 'showToast');
        await vi.runAllTimersAsync();
        await Promise.resolve(); await Promise.resolve();
      } finally {
        errorAppProto.setupDOMReferences = originalSetupDOMReferences;
        // Re-spy for subsequent tests in outer scope if needed, or rely on next beforeEach
        if(windowAddEventListenerSpy) windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');
      }

      expect(MockedErrorHandler.logError).toHaveBeenCalledWith('Failed to initialize app', expect.objectContaining({ message: 'Test DOM setup failed' }));
      if(testShowToastSpy) {
         expect(testShowToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Initialization Error'}));
      }
    });
  });

  describe('setupDOMReferences Specific Tests', () => {
    it('should correctly assign DOM elements to app.elements', () => {
      expect((app as any).elements.recordButton).toBeInstanceOf(HTMLButtonElement);
      expect((app as any).elements.transcriptionArea).toBeInstanceOf(HTMLDivElement);
    });

    it('should not throw error if a required DOM element is missing (error handled by initializeApp)', async () => {
      document.body.innerHTML = '<div id="app"></div>';
      const errorAppProto = AudioTranscriptionApp.prototype as any;
      const originalSetupDOM = errorAppProto.setupDOMReferences;
      errorAppProto.setupDOMReferences = vi.fn(() => { throw new Error('Required element missing test'); });

      let errorTestApp: AudioTranscriptionApp | null = null;
      let localShowToastSpy = vi.fn();
      try {
        windowAddEventListenerSpy?.mockRestore();
        errorTestApp = new AudioTranscriptionApp();
        vi.spyOn(errorTestApp as any, 'showToast').mockImplementation(localShowToastSpy);
        await vi.runAllTimersAsync();
        await Promise.resolve(); await Promise.resolve();
      } finally {
         errorAppProto.setupDOMReferences = originalSetupDOM;
         if(windowAddEventListenerSpy) windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');
      }
      expect(localShowToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Initialization Error'}));
    });
  });

  describe('setupEventListeners Specific Tests', () => {
    it('should add expected window event listeners', () => {
      // `app` is initialized in the outer beforeEach, so setupEventListeners has run.
      // `windowAddEventListenerSpy` was set up before app instantiation.
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('initializeAPIKey Specific Tests', () => {
    it('should set API key from localStorage and update UI elements if key exists', async () => {
      localStorageMock.setItem('geminiApiKey', 'ls-test-key');
      // Create a new app instance for this specific test condition
      windowAddEventListenerSpy?.mockRestore(); // Avoid issues with the global spy
      const localApp = new AudioTranscriptionApp();
      const localShowToastSpy = vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync();
      await Promise.resolve(); await Promise.resolve();

      expect(vi.mocked(mockApiService.setApiKey)).toHaveBeenCalledWith('ls-test-key');
      const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
      const rememberApiKeyCheckbox = document.getElementById('rememberApiKey') as HTMLInputElement;
      if (apiKeyInput) expect(apiKeyInput.value).toBe('ls-test-key');
      if (rememberApiKeyCheckbox) expect(rememberApiKeyCheckbox.checked).toBe(true);
      if(windowAddEventListenerSpy) windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');
    });

    it('should log message if no API key in localStorage', () => {
      // This test relies on the main `app` instance from the top-level beforeEach
      // where localStorage was empty for 'geminiApiKey' initially.
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No API key found in localStorage'));
    });
  });

  describe('initTheme Specific Tests', () => {
    it('should apply theme from localStorage if present', async () => {
      localStorageMock.setItem('voice-notes-theme', 'light');
      windowAddEventListenerSpy?.mockRestore();
      const localApp = new AudioTranscriptionApp();
      const localShowToastSpy = vi.spyOn(localApp as any, 'showToast').mockImplementation(() => {});
      await vi.runAllTimersAsync();
      await Promise.resolve(); await Promise.resolve();
      expect(document.body.className).toBe('light-mode');
      if(windowAddEventListenerSpy) windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');
    });
  });

  describe('setupAudioRecorder Specific Tests', () =>
  {
    it('should register callbacks with the AudioRecorder instance', () => {
      expect(appTranscriptAvailableCallback).toBeTypeOf('function');
      expect(appRecordingStateChangeCallback).toBeTypeOf('function');
    });
  });

  describe('Core Functionality Methods', () => {
    // app instance is from outer beforeEach and assumed to be fully initialized here.
    // Spies for UI methods (showToastSpy, etc.) are also set on this `app` instance in outer beforeEach.

    describe('toggleRecording()', () => {
        it('when not recording, and supported, and start is successful, should start recording', async () => {
            const appAudioRecorder = (app as any).audioRecorder;
            vi.spyOn(appAudioRecorder, 'isSupported').mockReturnValueOnce(true);
            const startRecordingSpy = vi.spyOn(appAudioRecorder, 'startRecording');
            startRecordingSpy.mockResolvedValueOnce(true);

            await app.toggleRecording();

            expect(startRecordingSpy).toHaveBeenCalled();
            expect((app as any).state.isRecording).toBe(true);
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Recording Started' }));
        });
         it('when recording, should stop recording', async () => {
            const appAudioRecorder = (app as any).audioRecorder;
            const stopRecordingSpy = vi.spyOn(appAudioRecorder, 'stopRecording');

            (app as any).state.isRecording = true;
            (app as any).transcriptBuffer = "some text";

            await app.toggleRecording();

            expect(stopRecordingSpy).toHaveBeenCalled();
            expect((app as any).currentTranscript).toBe("some text");
            expect((app as any).state.isRecording).toBe(false);
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Recording Complete'}));
        });
    });

    describe('polishCurrentTranscription()', () => {
        it('should successfully polish and update UI', async () => {
            (app as any).currentTranscript = 'raw text';
            vi.mocked(mockApiService.polishTranscription).mockResolvedValueOnce({ success: true, data: 'Newly polished text' });
            await app.polishCurrentTranscription();
            expect(mockApiService.polishTranscription).toHaveBeenCalledWith('raw text');
            expect((app as any).state.currentNote?.polishedNote).toBe('Newly polished text');
            expect(updatePolishedNoteAreaSpy).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Polishing Complete' }));
        });
    });

    describe('saveCurrentNote()', () => {
        it('should save current note and update display', () => {
            const noteToSave: Note = { id: 'testIdSave', rawTranscription: 'rawS', polishedNote: 'polishedS', timestamp: Date.now() };
            (app as any).state.currentNote = noteToSave;
            vi.mocked(mockDataProcessorRef.getAllNotes).mockReturnValueOnce([noteToSave as StoredNote]);
            app.saveCurrentNote();
            expect(mockDataProcessorRef.saveNote).toHaveBeenCalledWith(noteToSave);
            expect(updateNotesDisplaySpy).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Note Saved' }));
        });
    });

    describe('clearCurrentNote()', () => {
        it('should clear relevant data and update UI', () => {
            (app as any).currentTranscript = "test transcript to clear";
            (app as any).transcriptBuffer = "test buffer to clear";
            (app as any).state.currentNote = {id: "note", rawTranscription:"r", polishedNote:"p", timestamp:1};

            app.clearCurrentNote();

            expect((app as any).currentTranscript).toBe('');
            expect((app as any).transcriptBuffer).toBe('');
            expect((app as any).state.currentNote).toBeNull();
            expect(mockChartManager.destroyAllCharts).toHaveBeenCalled();
            expect(updateUISpy).toHaveBeenCalled(); // updateUI is called
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cleared' }));
        });
    });

    describe('generateCharts()', () => {
        it('should call API and create charts, expecting specific chartManager calls based on observed behavior', async () => {
            (app as any).fullTranscription = "chart data text for generateCharts";
            const chartPayload = {
                topics: { labels: ['topicA'], data: [10] },
                sentiment: { labels: ['positive'], data: [0.8] },
            };
            vi.mocked(mockApiService.generateChartData).mockResolvedValueOnce({ success: true, data: chartPayload });
            const localShowLoadingSpy = vi.spyOn(app as any, 'showLoading').mockImplementation(() => {});

            await app.generateCharts();

            expect(localShowLoadingSpy).toHaveBeenCalledWith('Generating charts...');
            expect(mockApiService.generateChartData).toHaveBeenCalledWith("chart data text for generateCharts");
            expect(mockChartManager.createChart).toHaveBeenCalledWith('topicsChart', chartPayload.topics, (app as any).chartInstances['topicsChart']);
            expect(mockChartManager.createChart).toHaveBeenCalledWith('sentimentChart', chartPayload.sentiment, (app as any).chartInstances['sentimentChart']);
            localShowLoadingSpy.mockRestore();
        });
    });

    describe('generateSampleCharts()', () => {
        it('should call API and create sample charts, expecting specific chartManager calls based on observed behavior', async () => {
            const sampleChartPayload = {
                topics: { labels: ['s_topicA'], data: [11] },
            };
            vi.mocked(mockApiService.generateSampleChartData).mockResolvedValueOnce({ success: true, data: sampleChartPayload });
            const localShowLoadingSpy = vi.spyOn(app as any, 'showLoading').mockImplementation(() => {});

            await app.generateSampleCharts();

            expect((app as any).isSampleData).toBe(true);
            expect(localShowLoadingSpy).toHaveBeenCalledWith('Generating sample charts...');
            expect(mockApiService.generateSampleChartData).toHaveBeenCalled();
            expect(mockChartManager.createChart).toHaveBeenCalledWith('topicsChart', sampleChartPayload.topics, (app as any).chartInstances['topicsChart']);
            expect(consoleLogSpy).toHaveBeenCalledWith('Sample charts generated successfully.');
            localShowLoadingSpy.mockRestore();
        });
    });

    describe('exportNotes()', () => {
        it('should call DataProcessor.exportNotes and trigger download', () => {
            app.exportNotes();
            expect(mockDataProcessorRef.exportNotes).toHaveBeenCalledWith('markdown', true);
            expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Export Complete' }));
        });
    });

    describe('loadNote(noteId: string)', () => {
        it('should load an existing note into current state and update UI', () => {
            const mockStoredNotes: StoredNote[] = [
                { id: 'note1', rawTranscription: 'raw1', polishedNote: 'polished1', timestamp: Date.now(), title: 'Note 1', isAutoSaved: true, lastModified: Date.now() },
            ];
            (app as any).state.notes = mockStoredNotes; // Populate notes into app state
            app.loadNote('note1');
            expect((app as any).state.currentNote).toEqual(mockStoredNotes[0]);
            expect((app as any).currentTranscript).toBe('raw1');
            expect(updateTranscriptionAreaSpy).toHaveBeenCalled();
            expect(updatePolishedNoteAreaSpy).toHaveBeenCalled();
        });
    });

    describe('deleteNote(noteId: string)', () => {
        it('should delete note, update state, update display, and show toast on success', () => {
            const initialNotes: StoredNote[] = [ { id: 'delNote1', rawTranscription: 'r1', polishedNote: 'p1', timestamp: 1, title: 'T1', isAutoSaved: true, lastModified: 1 }];
            (app as any).state.notes = [...initialNotes];
            vi.mocked(mockDataProcessorRef.deleteNote).mockReturnValueOnce(true);
            vi.mocked(mockDataProcessorRef.getAllNotes).mockReturnValueOnce([]);

            app.deleteNote('delNote1');
            expect(mockDataProcessorRef.deleteNote).toHaveBeenCalledWith('delNote1');
            expect((app as any).state.notes).toEqual([]);
            expect(updateNotesDisplaySpy).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Note Deleted' }));
        });
    });

    describe('testAPIConnection()', () => {
        it('should show success toast for successful connection', async () => {
            vi.mocked(mockApiService.testConnection).mockResolvedValueOnce({ success: true });
            await app.testAPIConnection();
            expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'API Connected' }));
        });
    });
  });

  describe('State Management & Callbacks', () => {
    let transcriptCallback: ((transcript: string) => void) | undefined = undefined;
    let stateChangeCallback: ((state: RecordingState) => void) | undefined = undefined;

    beforeEach(() => {
      // app is already initialized from the outer scope beforeEach.
      // Callbacks should have been captured by appTranscriptAvailableCallback & appRecordingStateChangeCallback
      transcriptCallback = appTranscriptAvailableCallback;
      stateChangeCallback = appRecordingStateChangeCallback;
    });

    describe('AudioRecorder onTranscriptAvailable Callback', () => {
      it('should update transcriptBuffer and call updateTranscriptionArea', () => {
        expect(transcriptCallback).withContext('Transcript callback should have been captured by the mock AudioRecorder.').toBeDefined();
        if (transcriptCallback) transcriptCallback('Hello world');
        expect((app as any).transcriptBuffer).toBe('Hello world ');
        expect(updateTranscriptionAreaSpy).toHaveBeenCalled();
      });

      it('should accumulate transcripts in transcriptBuffer', () => {
        expect(transcriptCallback).withContext('Transcript callback should have been captured.').toBeDefined();
        if (transcriptCallback) {
            transcriptCallback('First part.');
            expect((app as any).transcriptBuffer).toBe('First part. ');
            transcriptCallback(' Second part.');
            expect((app as any).transcriptBuffer).toBe('First part. Second part. '); // Check accumulation
            expect(updateTranscriptionAreaSpy).toHaveBeenCalledTimes(2);
        }
      });
    });

    describe('AudioRecorder onRecordingStateChange Callback', () => {
      it('should call updateRecordingUI with new recording state', () => {
        expect(stateChangeCallback).withContext('State change callback should have been captured.').toBeDefined();
        const newState: RecordingState = { isRecording: true, isPaused: false, duration: 1000, startTime: Date.now() };
        if (stateChangeCallback) stateChangeCallback(newState);
        expect(updateRecordingUISpy).toHaveBeenCalledWith(newState);
      });
    });
  });
  describe('Helper and Lifecycle Methods', () => {
    // app from outer beforeEach

    it('cleanup should call cleanup methods of services and clear intervals', () => {
      (app as any).autoSaveInterval = 111;
      (app as any).uiUpdateInterval = 222;

      const appAudioRecorder = (app as any).audioRecorder;
      const cleanupSpyAR = vi.spyOn(appAudioRecorder, 'cleanup');
      // window.clearInterval is global, not an instance method of IntervalManager for this test.
      // IntervalManager.clearInterval(id) is how it would be called if app managed IDs that way.
      // App directly calls global clearInterval.
      const globalClearIntervalSpy = vi.spyOn(window, 'clearInterval');

      app.cleanup();

      expect(globalClearIntervalSpy).toHaveBeenCalledWith(111);
      expect(globalClearIntervalSpy).toHaveBeenCalledWith(222);

      expect(mockPerformanceMonitor.cleanup).toHaveBeenCalled();
      expect(mockBundleOptimizer.cleanup).toHaveBeenCalled();
      expect(cleanupSpyAR).toHaveBeenCalled();
      expect(mockChartManager.destroyAllCharts).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('🧹 Starting application cleanup...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Application cleanup completed');
      globalClearIntervalSpy.mockRestore();
    });

    it('registerLazyModules should register expected modules', () => {
      expect(vi.mocked(mockBundleOptimizer.registerLazyModule)).toHaveBeenCalledWith('charting', expect.any(Function));
      expect(vi.mocked(mockBundleOptimizer.registerLazyModule)).toHaveBeenCalledWith('fileProcessing', expect.any(Function));
      expect(vi.mocked(mockBundleOptimizer.registerLazyModule)).toHaveBeenCalledWith('advancedFeatures', expect.any(Function));
    });

    describe('setupAutoSave callback', () => {
      let autoSaveCallback: () => void | undefined;
      let autoSaveOnErrorCallback: ((error: Error) => void) | undefined;

      beforeEach(() => {
        const autoSaveTask = capturedIntervalManagerTasks['AutoSave'];
        expect(autoSaveTask).withContext("AutoSave task should be captured by IntervalManager mock.").toBeDefined();
        if (!autoSaveTask) return;

        autoSaveCallback = autoSaveTask.callback;
        if (autoSaveTask.options && typeof autoSaveTask.options.onError === 'function') {
          autoSaveOnErrorCallback = autoSaveTask.options.onError;
        }
        expect(autoSaveCallback).withContext("AutoSave callback itself should be a function.").toBeTypeOf('function');
      });

      it('should save note if currentNote exists and not processing', () => {
        if (!autoSaveCallback) throw new Error('AutoSave callback not captured for test');
        (app as any).state.currentNote = { id: 'autosave', rawTranscription: 'raw', polishedNote: 'polished', timestamp: 123 };
        (app as any).state.isProcessing = false;
        autoSaveCallback();
        expect(mockDataProcessorRef.saveNote).toHaveBeenCalledWith((app as any).state.currentNote);
        expect(mockPerformanceMonitor.measureOperation).toHaveBeenCalled();
      });

      it('should not save note if no currentNote', () => {
        if (!autoSaveCallback) throw new Error('AutoSave callback not captured for test');
        (app as any).state.currentNote = null;
        autoSaveCallback();
        expect(mockDataProcessorRef.saveNote).not.toHaveBeenCalled();
      });

      it('should not save note if isProcessing is true', () => {
        if (!autoSaveCallback) throw new Error('AutoSave callback not captured for test');
        (app as any).state.currentNote = { id: 'autosave', rawTranscription: 'raw', polishedNote: 'polished', timestamp: 123 };
        (app as any).state.isProcessing = true;
        autoSaveCallback();
        expect(mockDataProcessorRef.saveNote).not.toHaveBeenCalled();
      });

      it('should log warning if DataProcessor.saveNote throws in autosave', () => {
        if (!autoSaveCallback) throw new Error('AutoSave callback not captured for test');
        if (!autoSaveOnErrorCallback) throw new Error('AutoSave onError callback not captured for test');

        (app as any).state.currentNote = { id: 'autosave_fail', rawTranscription: 'raw', polishedNote: 'polished', timestamp: 123 };
        (app as any).state.isProcessing = false;
        const saveError = new Error("Autosave DB error");

        vi.mocked(mockDataProcessorRef.saveNote).mockImplementationOnce(() => { throw saveError; });

        autoSaveOnErrorCallback(saveError);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Auto-save failed:', saveError);
      });
    });

    describe('setupPeriodicUpdates callback', () => {
      it('should call updatePerformanceUI', () => {
        const localUpdatePerformanceUISpy = vi.spyOn(app as any, 'updatePerformanceUI').mockImplementation(() => {});
        const uiUpdateTask = capturedIntervalManagerTasks['UIUpdate'];

        expect(uiUpdateTask).withContext("UIUpdate task should be captured.").toBeDefined();
        if (!uiUpdateTask) return;
        expect(uiUpdateTask.callback).withContext("UIUpdate callback should be a function.").toBeTypeOf('function');

        if (uiUpdateTask.callback) {
          uiUpdateTask.callback();
        }

        expect(localUpdatePerformanceUISpy).toHaveBeenCalled();
        localUpdatePerformanceUISpy.mockRestore();
      });
    });

    describe('updatePerformanceUI', () => {
      it('should do nothing if indicator is hidden', () => {
        document.getElementById('performanceIndicator')!.style.display = 'none';
        (app as any).updatePerformanceUI();
        expect(document.getElementById('memoryUsage')!.textContent).toBe('');
      });

      it('should update UI elements if indicator is visible and metrics exist', () => {
        document.getElementById('performanceIndicator')!.style.display = 'block';
        vi.mocked(mockPerformanceMonitor.getLatestMetrics).mockReturnValueOnce({ memoryUsage: 1024*1024*15, frameRate: 58.6, cpuUsage: 0 });
        vi.mocked(mockPerformanceMonitor.getRecentOperations).mockReturnValueOnce([{duration: 250}, {duration: 350}]);
        vi.mocked(mockPerformanceMonitor.getAlerts).mockReturnValueOnce([]);

        (app as any).updatePerformanceUI();

        expect(document.getElementById('memoryUsage')!.textContent).toBe('15.00MB');
        expect(document.getElementById('cpuUsage')!.textContent).toBe('30%'); // Based on (250+350)/2 / 10
        expect(document.getElementById('frameRate')!.textContent).toBe('59');
        expect(document.getElementById('performanceAlert')!.style.display).toBe('none');
      });

      it('should show alert if critical alerts exist and indicator is visible', () => {
        document.getElementById('performanceIndicator')!.style.display = 'block';
        vi.mocked(mockPerformanceMonitor.getAlerts).mockReturnValueOnce([{ type: 'memory', severity: 'critical', message: 'High memory usage!' }]);
        (app as any).updatePerformanceUI();
        expect(document.getElementById('performanceAlertText')!.textContent).toBe('High memory usage!');
        expect(document.getElementById('performanceAlert')!.style.display).toBe('flex');
      });
    });

    describe('togglePerformanceIndicator', () => {
      it('should make indicator visible and call updatePerformanceUI', () => {
        const indicator = document.getElementById('performanceIndicator')!;
        indicator.style.display = 'none';
        const updateSpy = vi.spyOn(app as any, 'updatePerformanceUI');

        (app as any).togglePerformanceIndicator();

        expect(indicator.style.display).toBe('block');
        expect(document.getElementById('performanceToggleButton')?.classList.contains('active')).toBe(true);
        expect(updateSpy).toHaveBeenCalled();
        updateSpy.mockRestore();
      });

      it('should make indicator hidden', () => {
        const indicator = document.getElementById('performanceIndicator')!;
        indicator.style.display = 'block';
        document.getElementById('performanceToggleButton')?.classList.add('active');
        (app as any).togglePerformanceIndicator();
        expect(indicator.style.display).toBe('none');
        expect(document.getElementById('performanceToggleButton')?.classList.contains('active')).toBe(false);
      });
    });

    describe('toggleTheme', () => {
      it('should toggle to light mode and update localStorage', () => {
        document.body.className = '';
        vi.mocked(localStorageMock.getItem).mockReturnValueOnce('dark');

        (app as any).toggleTheme();

        expect(document.body.className).toBe('light-mode');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('voice-notes-theme', 'light');
        expect(document.querySelector('#themeToggleButton i')?.className).toBe('fas fa-moon');
        expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Theme Changed', message: 'Switched to light mode' }));
        expect(mockProductionMonitor.trackEvent).toHaveBeenCalledWith('theme_toggled', expect.any(Object));
      });

      it('should toggle back to dark mode', () => {
        document.body.className = 'light-mode';
         vi.mocked(localStorageMock.getItem).mockReturnValueOnce('light');

        (app as any).toggleTheme();

        expect(document.body.className).toBe('');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('voice-notes-theme', 'dark');
        expect(document.querySelector('#themeToggleButton i')?.className).toBe('fas fa-sun');
      });

      it('should handle localStorage error during theme toggle', () => {
        const storageError = new Error('Storage failed');
        vi.mocked(localStorageMock.setItem).mockImplementationOnce(() => { throw storageError; });

        (app as any).toggleTheme();

        expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Theme Error' }));
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle theme:', storageError);
      });
    });
  });
});
