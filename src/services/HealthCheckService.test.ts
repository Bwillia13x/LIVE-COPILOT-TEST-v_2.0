// src/services/HealthCheckService.test.ts
import { HealthCheckService, HealthCheckResult } from './HealthCheckService';

// Mock environment config
// Define mockIsProduction here as it's used by a getter in the mock factory,
// which is fine with hoisting as the getter is called later.
let mockIsProduction = false;

jest.mock('../config/environment', () => {
  // Define mockAppConfig *inside* the factory to avoid hoisting issues
  const mockAppConfig_InFactory = { version: '1.0.0-test' };
  return {
    APP_CONFIG: mockAppConfig_InFactory,
    get IS_PRODUCTION() { // Use a getter to allow dynamic changes in tests
      return mockIsProduction;
    },
    getEnvironmentInfo: jest.fn().mockReturnValue(
      { // Mock implementation for getEnvironmentInfo - object starts on new line
        browser: 'TestBrowser 1.0',
        os: 'TestOS',
        language: 'en-US',
        timezone: 'UTC',
        userAgent: 'test-agent',
        screenResolution: '1920x1080',
        online: true,
      } // Closing brace for the object
    ) // Closing parenthesis for mockReturnValue
  }; // Closing brace for the object returned by the factory
}); // Added semicolon

// Global Mocks
let mockWindow: any;
let mockNavigator: any;
// Global Mocks
let mockFetch: jest.Mock;
// We will mock methods on the actual window.localStorage and window.performance
// instead of replacing the objects wholesale.

// Define localStorageStore at a higher scope to be accessible
let localStorageStore: { [key: string]: string } = {};

// Store references to spies so they can be reset/cleared
let getItemSpy: jest.SpyInstance;
let setItemSpy: jest.SpyInstance;
let removeItemSpy: jest.SpyInstance;
let clearSpy: jest.SpyInstance;

const setupGlobalMocks = () => {
  mockFetch = jest.fn();
  (global as any).window.fetch = mockFetch;

  // Reset and setup localStorage mock for each call to setupGlobalMocks (i.e., for each test)
  localStorageStore = {}; // Clear the backing store

  // Spy on JSDOM's actual localStorage methods and make them use our store
  // Target Storage.prototype for these spies
  getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(key => localStorageStore[key] || null);
  setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { localStorageStore[key] = value.toString(); });
  removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => { delete localStorageStore[key]; });
  clearSpy = jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
    localStorageStore = {};
  });
  // For 'length' and 'key', if the service uses them, they might need specific spyOn with getter if possible,
  // or direct Object.defineProperty on window.localStorage if JSDOM allows it.
  // For now, assuming primary usage is getItem/setItem/removeItem/clear.
  // If 'length' is critical:
  // jest.spyOn(window.localStorage, 'length', 'get').mockImplementation(() => Object.keys(localStorageStore).length);


  // Mock performance object and its methods
  (global as any).window.performance = {
    now: jest.fn().mockReturnValue(Date.now()), // Default mock for now()
    memory: { // Default mock for memory
      usedJSHeapSize: 10 * 1024 * 1024,
      totalJSHeapSize: 50 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    },
    // Add other performance methods if service uses them
  } as Performance;


  // Mock other window properties
  (global as any).window.WebSocket = jest.fn();
  (global as any).window.AudioContext = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
  (global as any).window.webkitAudioContext = undefined;
  (global as any).window.MediaRecorder = jest.fn();
  (global as any).window.screen = { width: 1920, height: 1080 } as Screen;

  // Mock navigator properties
  // JSDOM's navigator is also an object we can augment
  Object.defineProperty(global.window, 'navigator', {
    value: {
      userAgent: 'test-agent',
      language: 'en-US',
      onLine: true,
      serviceWorker: { // Default service worker mock
        controller: null,
      },
      // Add other navigator properties if needed by getEnvironmentInfo
    },
    writable: true,
    configurable: true,
  });
};


describe('HealthCheckService', () => {
  let serviceInstance: HealthCheckService;
  // Remove mockLocalStorage, mockPerformance, mockWindow, mockNavigator as they are now directly on global.window
  let originalDateNow: any;
  let currentMockTime: number;

  beforeAll(() => {
    // Freeze time for consistent uptime and timestamps
    originalDateNow = Date.now;
    currentMockTime = new Date('2023-01-01T00:00:00.000Z').getTime();
    Date.now = jest.fn(() => currentMockTime);
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    Date.now = originalDateNow;
    jest.useRealTimers();
  });

  beforeEach(() => {
    setupGlobalMocks();
    // Reset IS_PRODUCTION for each test if needed, default to false
    mockIsProduction = false;
    // Reset singleton instance for cleaner tests if possible, or manage state carefully
    // For true singleton, we test the same instance. Reset its internal startTime for uptime.
    serviceInstance = HealthCheckService.getInstance();
    (serviceInstance as any).startTime = Date.now();


    // Clear/reset mocks that are part of global window object
    (window.fetch as jest.Mock).mockClear();

    // Clear backing store and reset Jest spy implementations and call history
    localStorageStore = {};
    getItemSpy?.mockClear().mockImplementation(key => localStorageStore[key] || null);
    setItemSpy?.mockClear().mockImplementation((key, value) => { localStorageStore[key] = value.toString(); });
    removeItemSpy?.mockClear().mockImplementation(key => { delete localStorageStore[key]; });
    clearSpy?.mockClear().mockImplementation(() => { localStorageStore = {}; });

    // Ensure AudioContext mocks are cleared correctly
    if (window.AudioContext && typeof (window.AudioContext as jest.Mock).mockClear === 'function') {
        (window.AudioContext as jest.Mock).mockClear();
    }
    // webkitAudioContext is usually set to undefined or a mock directly in tests if needed
    if (window.webkitAudioContext && typeof (window.webkitAudioContext as jest.Mock).mockClear === 'function') {
        (window.webkitAudioContext as jest.Mock).mockClear();
    }
    if (window.MediaRecorder && typeof (window.MediaRecorder as jest.Mock).mockClear === 'function') {
        (window.MediaRecorder as jest.Mock).mockClear();
    }
    if (window.navigator && window.navigator.serviceWorker) {
        window.navigator.serviceWorker.controller = null;
    }

     // Reset performance.now mock for each test to ensure isolation
    let performanceNowCallCount = 0;
    (window.performance.now as jest.Mock).mockImplementation(() => {
        performanceNowCallCount++;
        return Date.now() + performanceNowCallCount * 10; // Increment time slightly
    });
    // Reset performance.memory to default for each test
    (window.performance as any).memory = {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
    };
  });

  it('getInstance should return the same instance', () => {
    const instance1 = HealthCheckService.getInstance();
    const instance2 = HealthCheckService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('getHealthStatus', () => {
    const advanceTime = (ms: number) => {
      currentMockTime += ms;
      jest.advanceTimersByTime(ms);
    };

    it('should return overall healthy status when all checks pass', async () => {
      (window.fetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // apiConnectivity
      (window as any).AudioContext = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
      (window as any).MediaRecorder = jest.fn();
      if (window.navigator && window.navigator.serviceWorker) window.navigator.serviceWorker.controller = {} as any; // Active service worker
      mockIsProduction = true;

      advanceTime(1000); // Simulate some time passing for uptime
      const result = await serviceInstance.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.metadata.version).toBe('1.0.0-test');
      // expect(result.metadata.environmentDetails?.os).toBe('TestOS'); // Service doesn't populate this yet
      expect(result.metadata.uptime).toBe(1000); // Based on advanceTime
      expect(result.checks.browserCompatibility.status).toBe('pass');
      expect(result.checks.apiConnectivity.status).toBe('pass');
      expect(result.checks.localStorage.status).toBe('pass');
      expect(result.checks.webAudio.status).toBe('pass');
      expect(result.checks.serviceWorker.status).toBe('pass');
      expect(result.checks.performance.status).toBe('pass');
      expect(result.checks.memory.status).toBe('pass');
    });

    it('should return overall warning if a check warns and none fail', async () => {
      (window.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down')); // apiConnectivity warns

      const result = await serviceInstance.getHealthStatus();
      expect(result.status).toBe('warning');
      expect(result.checks.apiConnectivity.status).toBe('warn');
      expect(result.checks.apiConnectivity.message).toContain('Network down');
    });

    it('should return overall unhealthy if a check fails', async () => {
      (global as any).window.fetch = undefined; // browserCompatibility fails

      const result = await serviceInstance.getHealthStatus();
      expect(result.status).toBe('unhealthy');
      expect(result.checks.browserCompatibility.status).toBe('fail');
      expect(result.checks.browserCompatibility.message).toContain('Missing browser features: fetch');
    });

    // --- Individual Check Tests ---

    describe('checkBrowserCompatibility', () => {
      it('fails if fetch is missing', async () => {
        (global as any).window.fetch = undefined;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.browserCompatibility.status).toBe('fail');
        expect(result.checks.browserCompatibility.message).toContain('fetch');
      });
       it('passes if webkitAudioContext is available and AudioContext is not', async () => {
        (global as any).window.AudioContext = undefined;
        (global as any).window.webkitAudioContext = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.browserCompatibility.status).toBe('pass');
        expect(result.checks.webAudio.status).toBe('pass');
      });
    });

    describe('checkApiConnectivity', () => {
      it('passes on successful fetch', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true } as Response);
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.apiConnectivity.status).toBe('pass');
      });
      it('warns on fetch error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('API Error'));
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.apiConnectivity.status).toBe('warn');
        expect(result.checks.apiConnectivity.message).toContain('API Error');
      });
    });

    describe('checkLocalStorage', () => {
      it('passes if localStorage works', async () => {
        // Default localStorage mock in setupGlobalMocks should handle this
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.localStorage.status).toBe('pass');
      });
      it('fails if setItem throws error', async () => {
        // console.log('setItem is:', typeof window.localStorage.setItem, 'Has .mock:', !!(window.localStorage.setItem as any).mock);
        setItemSpy.mockImplementationOnce(() => {
          throw new Error('Quota exceeded');
        });

        const result = await serviceInstance.getHealthStatus();

        // mockImplementationOnce for spies auto-restores. If not, manual restore needed:
        // setItemSpy.mockImplementation((key, value) => { localStorageStore[key] = value.toString(); });
        expect(result.checks.localStorage.status).toBe('fail');
        expect(result.checks.localStorage.message).toContain('Quota exceeded');
      });
       it('fails if retrieved value is different', async () => {
        // console.log('getItem is:', typeof window.localStorage.getItem, 'Has .mock:', !!(window.localStorage.getItem as any).mock);
        getItemSpy.mockReturnValueOnce('wrong_value');

        const result = await serviceInstance.getHealthStatus();

        // getItemSpy.mockImplementation(key => localStorageStore[key] || null); // Restore if not using Once
        expect(result.checks.localStorage.status).toBe('fail');
        expect(result.checks.localStorage.message).toContain('localStorage read/write failed');
      });
    });

    describe('checkWebAudio', () => {
      it('passes if AudioContext is available and instantiable', async () => {
        (global as any).window.AudioContext = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.webAudio.status).toBe('pass');
      });
      it('fails if no AudioContext is available', async () => {
        (global as any).window.AudioContext = undefined;
        (global as any).window.webkitAudioContext = undefined;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.webAudio.status).toBe('fail');
      });
      it('warns if AudioContext instantiation throws error', async () => {
        (global as any).window.AudioContext = jest.fn().mockImplementation(() => { throw new Error('Context error'); });
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.webAudio.status).toBe('warn');
        expect(result.checks.webAudio.message).toContain('Context error');
      });
    });

    describe('checkServiceWorker', () => {
      beforeEach(() => { // Ensure navigator.serviceWorker exists for these tests
        // Modify the global navigator directly for these tests
        (global as any).navigator.serviceWorker = { controller: null };
      });

      it('passes if IS_PRODUCTION is true and service worker is active', async () => {
        mockIsProduction = true;
        if (window.navigator && window.navigator.serviceWorker) window.navigator.serviceWorker.controller = {} as any;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.serviceWorker.status).toBe('pass');
      });
      it('warns if IS_PRODUCTION is true and service worker is not active', async () => {
        mockIsProduction = true;
        if (window.navigator && window.navigator.serviceWorker) window.navigator.serviceWorker.controller = null;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.serviceWorker.status).toBe('warn');
        expect(result.checks.serviceWorker.message).toBe('No active service worker');
      });
       it('warns if IS_PRODUCTION is true and serviceWorker not in navigator', async () => {
        mockIsProduction = true;
        (global as any).navigator.serviceWorker = undefined; // Simulate no SW support
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.serviceWorker.status).toBe('warn');
        expect(result.checks.serviceWorker.message).toBe('Service Worker not supported');
      });
      it('is not present if IS_PRODUCTION is false', async () => {
        mockIsProduction = false;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.serviceWorker).toBeUndefined();
      });
    });

    describe('checkPerformance & checkMemoryUsage (via performance.memory)', () => {
      it('passes with normal memory', async () => {
        // Default mock in setupGlobalMocks should cover this
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.performance.status).toBe('pass');
        expect(result.checks.memory.status).toBe('pass');
        expect(result.checks.memory.message).toContain('Memory usage normal');
      });
       it('performance warns if performance API not available', async () => {
        const originalPerf = window.performance;
        (global as any).window.performance = undefined;

        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.performance.status).toBe('warn');
        expect(result.checks.performance.message).toBe('Performance API not available');

        (global as any).window.performance = originalPerf;
      });
      it('performance warns if memory usage is high (but not critical for checkMemoryUsage)', async () => {
        const originalMemoryBackup = { ... (global as any).window.performance.memory }; // Shallow copy for restoration

        // Directly modify properties of the existing window.performance.memory object
        const perfMemory = (global as any).window.performance.memory;
        perfMemory.usedJSHeapSize = 101 * 1024 * 1024; // 101MB
        perfMemory.totalJSHeapSize = 150 * 1024 * 1024;
        perfMemory.jsHeapSizeLimit = 200 * 1024 * 1024;

        console.log('Test: window.performance.memory during test:', JSON.stringify((global as any).window.performance.memory));

        const result = await serviceInstance.getHealthStatus();

        // Restore original memory values
        (global as any).window.performance.memory = originalMemoryBackup;

        expect(result.checks.performance.status).toBe('warn');
        expect(result.checks.performance.message).toContain('High memory usage: 101.00MB');
        expect(result.checks.memory.status).toBe('pass');
      });
      it('memory warns if usage is > 80% but < 95%', async () => {
        (global as any).window.performance.memory = { usedJSHeapSize: 85e6, totalJSHeapSize: 100e6, jsHeapSizeLimit: 100e6 };
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.memory.status).toBe('warn');
        expect(result.checks.memory.message).toContain('High memory usage: 85.0%');
      });
      it('memory fails if usage is > 95%', async () => {
        (global as any).window.performance.memory = { usedJSHeapSize: 96e6, totalJSHeapSize: 100e6, jsHeapSizeLimit: 100e6 };
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.memory.status).toBe('fail');
        expect(result.checks.memory.message).toContain('Critical memory usage: 96.0%');
      });
       it('memory warns if performance.memory is not available', async () => {
        (global as any).window.performance.memory = undefined;
        const result = await serviceInstance.getHealthStatus();
        expect(result.checks.performance.status).toBe('pass');
        expect(result.checks.memory.status).toBe('warn');
        expect(result.checks.memory.message).toBe('Memory usage information not available');
      });
    });
  });

  describe('isHealthy', () => {
    it('should return true when status is healthy', async () => {
      (window.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      (window as any).AudioContext = jest.fn().mockImplementation(() => ({ close: jest.fn() }));
      // Default mocks for localStorage and performance.memory are set to pass

      const healthy = await serviceInstance.isHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when status is warning', async () => {
      (window.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));
      const healthy = await serviceInstance.isHealthy();
      expect(healthy).toBe(false);
    });

    it('should return false when status is unhealthy', async () => {
      (global as any).window.fetch = undefined;
      const healthy = await serviceInstance.isHealthy();
      expect(healthy).toBe(false);
    });
  });
});
