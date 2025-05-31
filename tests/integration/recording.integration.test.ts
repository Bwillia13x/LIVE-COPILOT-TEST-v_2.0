import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioTranscriptionApp } from '../../src/components/AudioTranscriptionApp';
// Import any other necessary types or constants

// --- Mock Browser APIs (used by AudioRecorder) ---

// Mock MediaStream
const mockMediaStreamTrackStop = vi.fn();
const mockGetTracks = vi.fn(() => [
  { stop: mockMediaStreamTrackStop },
  { stop: mockMediaStreamTrackStop }
]);
const mockMediaStream = {
  getTracks: mockGetTracks,
} as unknown as MediaStream;

// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn();
if (typeof navigator === 'undefined') (globalThis as any).navigator = {};
if (!(navigator as any).mediaDevices) (navigator as any).mediaDevices = {};
(navigator.mediaDevices as any).getUserMedia = mockGetUserMedia;

// Mock MediaRecorder
let mockMediaRecorderInstance: any;
const mockMediaRecorderStart = vi.fn();
const mockMediaRecorderStop = vi.fn();
const mockMediaRecorderPause = vi.fn();
const mockMediaRecorderResume = vi.fn();
const MockMediaRecorder = vi.fn((stream: MediaStream, options: any) => {
  mockMediaRecorderInstance = {
    start: mockMediaRecorderStart,
    stop: mockMediaRecorderStop,
    pause: mockMediaRecorderPause,
    resume: mockMediaRecorderResume,
    state: 'inactive',
    ondataavailable: null as ((event: any) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as ((event: any) => void) | null,
    mimeType: options?.mimeType || '',
    stream: stream,
  };
  // Simulate state changes based on method calls
  mockMediaRecorderStart.mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'recording'; });
  mockMediaRecorderStop.mockImplementation(() => {
    if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'inactive';
    if (mockMediaRecorderInstance && typeof mockMediaRecorderInstance.onstop === 'function') {
      mockMediaRecorderInstance.onstop();
    }
  });
  mockMediaRecorderPause.mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'paused'; });
  mockMediaRecorderResume.mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'recording'; });

  return mockMediaRecorderInstance;
});
vi.stubGlobal('MediaRecorder', MockMediaRecorder);

// Mock SpeechRecognition (and webkitSpeechRecognition)
let mockSpeechRecognitionInstance: any;
const mockSpeechRecognitionStart = vi.fn();
const mockSpeechRecognitionStop = vi.fn();
const MockSpeechRecognition = vi.fn(() => {
  mockSpeechRecognitionInstance = {
    start: mockSpeechRecognitionStart,
    stop: mockSpeechRecognitionStop,
    continuous: false,
    interimResults: false,
    lang: '',
    onresult: null as ((event: any) => void) | null,
    onerror: null as ((event: any) => void) | null,
    onend: null as (() => void) | null,
  };
  return mockSpeechRecognitionInstance;
});
vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);

// --- Mock Other Services (as used by AudioTranscriptionApp) ---
const mockApiServiceInstance = {
  setApiKey: vi.fn(),
  testConnection: vi.fn().mockResolvedValue({ success: true }),
  polishTranscription: vi.fn().mockResolvedValue({ success: true, data: 'polished integration text' }),
  generateChartData: vi.fn().mockResolvedValue({ success: true, data: { topics: { label: 't', data: [1]}} }),
  generateSampleChartData: vi.fn().mockResolvedValue({ success: true, data: { topics: { label: 'st', data: [1]}} }),
  hasValidApiKey: vi.fn(() => true),
};
vi.doMock('../../src/services/APIService', () => ({
  APIService: vi.fn(() => mockApiServiceInstance),
}));

const mockChartManagerInstance = {
  createChart: vi.fn(),
  destroyAllCharts: vi.fn(),
  resizeAllCharts: vi.fn(),
};
vi.doMock('../../src/services/ChartManager', () => ({
  ChartManager: vi.fn(() => mockChartManagerInstance),
}));

const mockDataProcessor = {
  saveNote: vi.fn(),
  getAllNotes: vi.fn().mockReturnValue([]),
  deleteNote: vi.fn().mockReturnValue(true),
  exportNotes: vi.fn().mockReturnValue('exported integration data'),
  generateTitle: vi.fn((text: string) => text ? text.substring(0,30) : 'Untitled Integration Note'),
  analyzeTranscription: vi.fn().mockReturnValue({ wordCount: 0, characterCount: 0, estimatedReadingTime: 0, keyPhrases: [] }),
  clearAllNotes: vi.fn(),
};
vi.doMock('../../src/services/DataProcessor', () => ({ DataProcessor: mockDataProcessor }));

const mockPerformanceMonitorInstance = {
  startMonitoring: vi.fn(),
  measureOperation: vi.fn(async (fn) => typeof fn === 'function' ? await fn() : Promise.resolve(fn)),
  cleanup: vi.fn(),
  getLatestMetrics: vi.fn().mockReturnValue({ memoryUsage: 10, cpuUsage: 5, frameRate: 60, jsHeapSizeLimit: 2000, totalJSHeapSize: 1000, usedJSHeapSize: 500 }),
  getRecentOperations: vi.fn().mockReturnValue([]),
  getAlerts: vi.fn().mockReturnValue([]),
};
vi.doMock('../../src/services/PerformanceMonitor', () => ({ PerformanceMonitor: { getInstance: vi.fn(() => mockPerformanceMonitorInstance) } }));

let capturedIntervalManagerTasksIntegration: Record<string, any> = {};
const mockIntervalManagerInstance = {
  createRecurringTask: vi.fn((taskName, interval, callback, options) => {
    capturedIntervalManagerTasksIntegration[taskName] = { taskName, interval, callback, options };
    return Math.floor(Math.random() * 100000);
  }),
  clearInterval: vi.fn(),
  cleanup: vi.fn(),
};
vi.doMock('../../src/services/IntervalManager', () => ({ IntervalManager: { getInstance: vi.fn(() => mockIntervalManagerInstance) } }));

const mockBundleOptimizerInstance = {
  registerLazyModule: vi.fn(),
  loadCriticalModules: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn()
};
vi.doMock('../../src/services/BundleOptimizer', () => ({ BundleOptimizer: { getInstance: vi.fn(() => mockBundleOptimizerInstance) } }));

const mockProductionMonitorInstance = {
  trackEvent: vi.fn(),
  trackError: vi.fn()
};
vi.doMock('../../src/services/ProductionMonitor', () => ({ ProductionMonitor: { getInstance: vi.fn(() => mockProductionMonitorInstance) } }));

const mockHealthCheckServiceInstance = {
  getHealthStatus: vi.fn().mockResolvedValue({ status: 'healthy', checks: {} })
};
vi.doMock('../../src/services/HealthCheckService', () => ({ HealthCheckService: { getInstance: vi.fn(() => mockHealthCheckServiceInstance) } }));

const mockErrorHandlerLogError = vi.fn();
const mockMemoryManagerCleanup = vi.fn();
vi.doMock('../../src/utils', async (importOriginal) => {
    const original = await importOriginal() as any;
    return {
      ...original,
      ErrorHandler: { ...original.ErrorHandler, logError: mockErrorHandlerLogError, getInstance: vi.fn(() => ({ handleAppError: vi.fn() })) },
      MemoryManager: { ...original.MemoryManager, cleanup: mockMemoryManagerCleanup, getInstance: vi.fn(() => ({ cleanup: vi.fn() }))},
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


describe('Integration: Recording Flow', () => {
  let app: AudioTranscriptionApp;
  let AudioTranscriptionAppModule: typeof import('../../src/components/AudioTranscriptionApp');
  let showToastSpy: import('vitest').SpyInstance; // Declare showToastSpy here

  const setupDOMForIntegration = () => {
    document.body.innerHTML = \`
      <button id="recordButton">Start Recording</button>
      <div id="rawTranscription"></div>
      <div id="polishedNote"></div>
      <div id="recordingStatus">Ready</div>
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
        <button class="tab-button" data-tab="note"></button> <button class="tab-button" data-tab="raw"></button>
        <div class="active-tab-indicator"></div>
      </div>
      <button id="confirmExport"></button>
      <button id="themeToggleButton"><i></i></button>
      <div id="performanceIndicator"></div>
      <button id="performanceToggleButton"></button>
      <div id="notesContainer"></div>
      <div id="aiChartDisplayArea"></div>
      <div id="app"></div>
    \`;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

    mockGetUserMedia.mockReset().mockResolvedValue(mockMediaStream);
    mockMediaStreamTrackStop.mockReset();
    mockGetTracks.mockReset().mockReturnValue([{ stop: mockMediaStreamTrackStop }, { stop: mockMediaStreamTrackStop }]);

    MockMediaRecorder.mockClear();
    mockMediaRecorderStart.mockReset().mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'recording'; });
    mockMediaRecorderStop.mockReset().mockImplementation(() => {
      if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'inactive';
      if (mockMediaRecorderInstance && typeof mockMediaRecorderInstance.onstop === 'function') {
        mockMediaRecorderInstance.onstop();
      }
    });
    mockMediaRecorderPause.mockReset().mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'paused'; });
    mockMediaRecorderResume.mockReset().mockImplementation(() => { if(mockMediaRecorderInstance) mockMediaRecorderInstance.state = 'recording'; });

    if (mockMediaRecorderInstance) {
        mockMediaRecorderInstance.state = 'inactive';
        mockMediaRecorderInstance.ondataavailable = null;
        mockMediaRecorderInstance.onstop = null;
        mockMediaRecorderInstance.onerror = null;
    }

    MockSpeechRecognition.mockClear();
    mockSpeechRecognitionStart.mockReset();
    mockSpeechRecognitionStop.mockReset();
    if (mockSpeechRecognitionInstance) {
      mockSpeechRecognitionInstance.onresult = null;
      mockSpeechRecognitionInstance.onerror = null;
      mockSpeechRecognitionInstance.onend = null;
    }

    Object.values(mockApiServiceInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockChartManagerInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockDataProcessor).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockPerformanceMonitorInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockIntervalManagerInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockBundleOptimizerInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockProductionMonitorInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    Object.values(mockHealthCheckServiceInstance).forEach(m => { if(vi.isMockFunction(m)) m.mockClear(); });
    mockErrorHandlerLogError.mockClear();
    mockMemoryManagerCleanup.mockClear();

    mockApiServiceInstance.testConnection.mockResolvedValue({ success: true });
    mockApiServiceInstance.polishTranscription.mockResolvedValue({ success: true, data: 'polished integration text' }); // Default mock
    mockApiServiceInstance.generateChartData.mockResolvedValue({ success: true, data: { topics: {label:'t', data:[1]}} });
    mockApiServiceInstance.generateSampleChartData.mockResolvedValue({ success: true, data: { topics: {label:'st', data:[1]}} });
    mockApiServiceInstance.hasValidApiKey.mockReturnValue(true);
    mockDataProcessor.getAllNotes.mockReturnValue([]);
    mockDataProcessor.deleteNote.mockReturnValue(true);
    mockDataProcessor.exportNotes.mockReturnValue('exported integration data');
    mockPerformanceMonitorInstance.getLatestMetrics.mockReturnValue({ memoryUsage: 10, cpuUsage: 5, frameRate: 60, jsHeapSizeLimit: 2000, totalJSHeapSize: 1000, usedJSHeapSize: 500 });

    localStorageMock.clear.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    setupDOMForIntegration();

    AudioTranscriptionAppModule = await import('../../src/components/AudioTranscriptionApp');
    app = new AudioTranscriptionAppModule.AudioTranscriptionApp();

    // Spy on showToast after app is instantiated
    if(showToastSpy) showToastSpy.mockRestore(); // if spied in a previous test using app instance
    showToastSpy = vi.spyOn(app as any, 'showToast');

    await vi.runAllTimersAsync();
    await Promise.resolve(); await Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should record a short phrase and display it in the raw transcription area', async () => {
    const recordButton = document.getElementById('recordButton') as HTMLButtonElement;
    expect(recordButton).not.toBeNull();
    recordButton.click();
    await vi.runAllTimersAsync(); await Promise.resolve();

    expect(mockGetUserMedia).toHaveBeenCalled();
    expect(MockMediaRecorder).toHaveBeenCalled();
    expect(mockMediaRecorderInstance.start).toHaveBeenCalled();
    expect(MockSpeechRecognition).toHaveBeenCalled();
    expect(mockSpeechRecognitionInstance.start).toHaveBeenCalled();
    expect((app as any).state.isRecording).toBe(true);
    expect(recordButton.textContent).toContain('Stop Recording');
    expect(document.getElementById('recordingStatus')?.textContent).toContain('Recording');

    expect(mockSpeechRecognitionInstance).toBeDefined();
    expect(mockSpeechRecognitionInstance.onresult).toBeTypeOf('function');

    const mockSpeechEvent = {
      resultIndex: 0,
      results: [ { isFinal: true, 0: { transcript: 'Hello world integration test' } } ]
    };
    if (mockSpeechRecognitionInstance.onresult) {
      mockSpeechRecognitionInstance.onresult(mockSpeechEvent as any);
    } else { throw new Error('onresult handler not set on mockSpeechRecognitionInstance'); }
    await vi.runAllTimersAsync(); await Promise.resolve();

    const rawTranscriptionArea = document.getElementById('rawTranscription');
    expect(rawTranscriptionArea?.textContent).toContain('Hello world integration test');
    expect((app as any).transcriptBuffer).toContain('Hello world integration test ');

    recordButton.click();
    await vi.runAllTimersAsync(); await Promise.resolve();

    expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
    if(mockSpeechRecognitionInstance.stop) expect(mockSpeechRecognitionInstance.stop).toHaveBeenCalled();

    expect((app as any).state.isRecording).toBe(false);
    expect((app as any).currentTranscript).toBe('Hello world integration test');
    expect(recordButton.textContent).toContain('Start Recording');
    expect(document.getElementById('recordingStatus')?.textContent).toContain('Ready');
  });

  it('should allow polishing a recorded transcript and display the polished version', async () => {
    // 1. Perform Initial Recording
    const recordButton = document.getElementById('recordButton') as HTMLButtonElement;
    recordButton.click(); // Start recording
    await vi.runAllTimersAsync(); await Promise.resolve();

    const rawTranscript = 'this is raw text for polishing';
    const mockSpeechEvent = {
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: rawTranscript } }]
    };
    if (mockSpeechRecognitionInstance && mockSpeechRecognitionInstance.onresult) {
      mockSpeechRecognitionInstance.onresult(mockSpeechEvent as any);
    } else {
      throw new Error('onresult handler not set on mockSpeechRecognitionInstance for polishing test');
    }
    await vi.runAllTimersAsync(); await Promise.resolve();

    recordButton.click(); // Stop recording
    await vi.runAllTimersAsync(); await Promise.resolve();
    expect((app as any).currentTranscript).toBe(rawTranscript);

    // 3. Mock APIService.polishTranscription
    const polishedTranscript = 'This is beautifully polished text.';
    vi.mocked(mockApiServiceInstance.polishTranscription).mockResolvedValueOnce({
      success: true,
      data: polishedTranscript
    });
    // showToastSpy is already set up in the main beforeEach to spy on app.showToast

    // 4. Call polishCurrentTranscription directly
    await (app as any).polishCurrentTranscription();
    await vi.runAllTimersAsync(); // Allow async operations to settle

    // 5. Verify Polishing Action and UI Update
    expect(mockApiServiceInstance.polishTranscription).toHaveBeenCalledWith(rawTranscript);
    expect((app as any).state.currentNote?.rawTranscription).toBe(rawTranscript);
    expect((app as any).state.currentNote?.polishedNote).toBe(polishedTranscript);

    const polishedNoteArea = document.getElementById('polishedNote');
    expect(polishedNoteArea?.textContent).toContain(polishedTranscript);
    expect(showToastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Polishing Complete' }));
  });
});
