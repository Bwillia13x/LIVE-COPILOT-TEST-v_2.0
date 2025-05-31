// src/services/PerformanceMonitor.test.ts
import { PerformanceMonitor, PerformanceMetrics, PerformanceAlert } from './PerformanceMonitor';
// Import types for mocked services
import { LoggerService as LoggerServiceType, MemoryManager as MemoryManagerType } from '../utils';

// Module-scoped variables to hold the mock instances, retrieved in beforeEach
let mockLoggerServiceInstance: {
  debug: jest.Mock; info: jest.Mock; error: jest.Mock; warn: jest.Mock;
};
let mockMemoryManagerInstance: {
  trackInterval: jest.Mock; clearInterval: jest.Mock; getStats: jest.Mock;
  // Add other method types if PerformanceMonitor uses them
};

jest.mock('../utils', () => {
  // These instances are created *inside* this factory scope when Jest processes mocks.
  // getInstance() will always return these specific objects for this test file.
  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  const memoryManagerMock = {
    trackInterval: jest.fn(),
    clearInterval: jest.fn(),
    getStats: jest.fn().mockReturnValue({ intervals: 0, timeouts: 0, eventListeners: 0 }),
    // Add other methods if PerformanceMonitor uses them
  };

  return {
    LoggerService: {
      getInstance: jest.fn().mockReturnValue(loggerMock),
    },
    MemoryManager: {
      getInstance: jest.fn().mockReturnValue(memoryManagerMock),
    },
  };
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockDateNow: jest.SpyInstance;
  let mockPerformanceNow: jest.SpyInstance;
  let mockSetInterval: jest.SpyInstance;
  let mockClearInterval: jest.SpyInstance;

  const initialTime = 1000000000000;
  let currentPerformanceTime: number;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Retrieve the mock instances that will be used by the service by calling getInstance
    const MockedUtils = require('../utils'); // This gets the mocked module
    mockLoggerServiceInstance = MockedUtils.LoggerService.getInstance();
    mockMemoryManagerInstance = MockedUtils.MemoryManager.getInstance();

    // Clear all methods on these retrieved mock instances
    Object.values(mockLoggerServiceInstance).forEach(mockFn => (mockFn as jest.Mock).mockClear());
    Object.values(mockMemoryManagerInstance).forEach(mockFn => (mockFn as jest.Mock).mockClear());

    // Clear the getInstance mocks themselves
    MockedUtils.LoggerService.getInstance.mockClear();
    MockedUtils.MemoryManager.getInstance.mockClear();

    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(initialTime);

    currentPerformanceTime = 0; // Reset for performance.now()
    mockPerformanceNow = jest.spyOn(performance, 'now').mockImplementation(() => {
      currentPerformanceTime += 10; // Increment by a small fixed amount per call
      return currentPerformanceTime;
    });

    // Mock performance.memory - Define it as JSDOM doesn't have it.
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10 * 1024 * 1024, // Default 10MB
        totalJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      },
      writable: true,
      configurable: true,
    });

    // Force reset singleton instance for clean tests
    if ((PerformanceMonitor as any).instance) {
      (PerformanceMonitor as any).instance.cleanup();
      (PerformanceMonitor as any).instance = undefined;
    }

    // Spy on window timer functions *before* getInstance is called
    mockSetInterval = jest.spyOn(window, 'setInterval');
    mockClearInterval = jest.spyOn(window, 'clearInterval');

    performanceMonitor = PerformanceMonitor.getInstance();
  });

  afterEach(() => {
    performanceMonitor.cleanup(); // Ensure monitoring is stopped and data cleared
    jest.clearAllTimers();
    mockDateNow.mockRestore();
    mockPerformanceNow.mockRestore();
    mockSetInterval.mockRestore(); // Restore spies on window methods
    mockClearInterval.mockRestore();
    delete (performance as any).memory; // Clean up defined property
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('getInstance should return the same instance', () => {
    expect(PerformanceMonitor.getInstance()).toBe(performanceMonitor);
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring on instantiation and set an interval for collectMetrics', () => {
      expect(mockMemoryManagerInstance.trackInterval).toHaveBeenCalled();
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('stopMonitoring should clear the monitoring interval', () => {
      const intervalId = (performanceMonitor as any).monitoringInterval;
      performanceMonitor.stopMonitoring();
      expect(mockMemoryManagerInstance.clearInterval).toHaveBeenCalledWith(intervalId);
      expect((performanceMonitor as any).monitoringInterval).toBeNull();
    });

    it('collectMetrics should gather data and check thresholds', () => {
      mockMemoryManagerInstance.getStats.mockReturnValueOnce({ intervals: 2, timeouts: 1, eventListeners: 10 });
      (performance as any).memory.usedJSHeapSize = 20 * 1024 * 1024; // Directly modify

      jest.advanceTimersByTime(5000); // Trigger collectMetrics

      expect(mockMemoryManagerInstance.getStats).toHaveBeenCalled();
      // expect(performance.memory.usedJSHeapSize) was accessed via spy
      const metrics = performanceMonitor.getLatestMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.memoryUsage).toBe(20 * 1024 * 1024);
      expect(metrics?.activeTimers).toBe(3);
      expect(metrics?.activeListeners).toBe(10);
      // Implicitly tests checkThresholds via alert generation below
    });

    it('collectMetrics should limit metrics history', () => {
      const maxHistory = (performanceMonitor as any).maxMetricsHistory;
      for (let i = 0; i < maxHistory + 5; i++) {
        jest.advanceTimersByTime(5000); // Trigger collectMetrics
      }
      expect(performanceMonitor.getMetrics().length).toBe(maxHistory);
    });
  });

  describe('measureOperation', () => {
    beforeEach(() => {
        // Ensure there's an initial metric entry for measureOperation to update
        // This also ensures performanceMonitor internal 'latestMetrics' is not null
        jest.advanceTimersByTime(5000);
    });

    it('should measure a synchronous operation and update metrics', () => {
      const syncOp = jest.fn(() => 'result');
      const initialPerfTime = currentPerformanceTime;

      const result = performanceMonitor.measureOperation(syncOp, 'renderTime', 'testSyncOp');

      expect(result).toBe('result');
      expect(syncOp).toHaveBeenCalled();
      const duration = 10; // Expected duration based on mockPerformanceNow increment
      expect(performanceMonitor.getLatestMetrics()?.renderTime).toBe(duration);
      expect(performanceMonitor.getRecentOperations()).toContainEqual(
        expect.objectContaining({ name: 'testSyncOp', duration })
      );
    });

    it('should measure an asynchronous operation (resolve) and update metrics', async () => {
      const asyncOp = jest.fn(() => Promise.resolve('asyncResult'));
      // const initialPerfTime = currentPerformanceTime; // Not needed if expecting fixed duration

      const resultPromise = performanceMonitor.measureOperation(asyncOp, 'apiResponseTime', 'testAsyncOp');
      expect(resultPromise).toBeInstanceOf(Promise);
      const result = await resultPromise;

      expect(result).toBe('asyncResult');
      const duration = 10; // Expected duration
      expect(performanceMonitor.getLatestMetrics()?.apiResponseTime).toBe(duration);
      expect(performanceMonitor.getRecentOperations()).toContainEqual(
        expect.objectContaining({ name: 'testAsyncOp', duration })
      );
    });

    it('should generate an alert if operation exceeds threshold', () => {
      const slowOp = () => {
        // The mock for performance.now below will simulate the duration
      };

      // Reset mockPerformanceNow for this specific test to control its return values precisely
      mockPerformanceNow.mockReset();
      mockPerformanceNow
        .mockReturnValueOnce(10)  // Corresponds to startTime in measureOperation
        .mockReturnValueOnce(10 + 150); // Corresponds to endTime in measureOperation, simulating 150ms duration

      performanceMonitor.measureOperation(slowOp, 'renderTime', 'slowRender');

      const alerts = performanceMonitor.getAlerts();
      const specificAlert = alerts.find(a => a.type === 'latency' && a.message.includes('slowRender'));
      expect(specificAlert).toBeDefined();
      if (specificAlert) {
        expect(specificAlert.value).toBe(150);
        expect(specificAlert.threshold).toBe((performanceMonitor as any).thresholds.renderTime);
      }
    });

    it('should handle promise rejection and add error alert', async () => {
      const failingAsyncOp = jest.fn(() => Promise.reject(new Error('Async fail')));

      try {
        await performanceMonitor.measureOperation(failingAsyncOp, 'apiResponseTime', 'testFailingAsync');
      } catch (e:any) {
        expect(e.message).toBe('Async fail');
      }

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.some(a => a.type === 'error' && a.message.includes('testFailingAsync'))).toBe(true);
      const recentOps = performanceMonitor.getRecentOperations();
      // The duration might be very small if the promise rejects quickly
      expect(recentOps.some(op => op.name === 'testFailingAsync (Error)')).toBe(true);
    });

    it('should manage recentOperations history size', () => {
        const op = () => {};
        const expectedMaxOps = 10; // Hardcoded in PerformanceMonitor.ts
        for (let i = 0; i < expectedMaxOps + 5; i++) {
            performanceMonitor.measureOperation(op, 'renderTime', `op${i}`);
        }
        expect(performanceMonitor.getRecentOperations().length).toBe(expectedMaxOps);
    });
  });

  describe('Thresholds and Alerting', () => {
    it('checkThresholds should generate memory alert', () => {
      // Modify the defined performance.memory for this test
      (performance as any).memory.usedJSHeapSize = 150 * 1024 * 1024;
      jest.advanceTimersByTime(5000); // Trigger collectMetrics
      expect(performanceMonitor.getAlerts().some(a => a.type === 'memory' && a.severity === 'high')).toBe(true);
      // Reset for other tests if not done by afterEach already (it is)
      (performance as any).memory.usedJSHeapSize = 10 * 1024 * 1024;
    });

    it('checkThresholds should generate active timers alert', () => {
      mockMemoryManagerInstance.getStats.mockReturnValueOnce({ intervals: 30, timeouts: 25, eventListeners: 10 }); // Total 55, Threshold 50
      jest.advanceTimersByTime(5000);
      expect(performanceMonitor.getAlerts().some(a => a.type === 'resource' && a.message.includes('active timers') && a.severity === 'medium')).toBe(true);
    });

    it('getSeverity should return correct severity levels', () => {
        const pm = performanceMonitor as any;
        expect(pm.getSeverity(100, 100, 150, 200)).toBe('low'); // value, thresholdLow, thresholdMedium, thresholdHigh
        expect(pm.getSeverity(120, 100, 120, 150)).toBe('medium'); // Example thresholds for latency/resources
        expect(pm.getSeverity(150, 100, 120, 150)).toBe('high');
        expect(pm.getSeverity(200, 100, 120, 150)).toBe('critical');
    });

    it('addAlert should manage alert history and log critical/high alerts', () => {
      const expectedMaxAlerts = 50; // Hardcoded in PerformanceMonitor.ts
      for (let i = 0; i < expectedMaxAlerts + 5; i++) {
        performanceMonitor.addAlert({ type: 'memory', severity: 'low', message: `m${i}`, value:0, threshold:0, timestamp:0 });
      }
      expect(performanceMonitor.getAlerts().length).toBe(expectedMaxAlerts);

      performanceMonitor.addAlert({ type: 'latency', severity: 'critical', message: 'crit', value:0, threshold:0, timestamp:0 });
      expect(mockLoggerServiceInstance.warn).toHaveBeenCalledWith(expect.stringContaining('[critical]: crit'));
    });
  });

  describe('Data Retrieval and Cleanup', () => {
    it('getMetrics should return a copy of metrics', () => {
      jest.advanceTimersByTime(5000);
      const metrics1 = performanceMonitor.getMetrics();
      metrics1.push({} as PerformanceMetrics);
      const metrics2 = performanceMonitor.getMetrics();
      expect(metrics2.length).toBe(metrics1.length - 1);
    });

    it('getAlerts should return a copy of alerts', () => {
      performanceMonitor.addAlert({ type: 'memory', severity: 'low', message: 'm', value:0, threshold:0, timestamp:0 });
      const alerts1 = performanceMonitor.getAlerts();
      alerts1.push({} as PerformanceAlert);
      const alerts2 = performanceMonitor.getAlerts();
      expect(alerts2.length).toBe(alerts1.length - 1);
    });

    it('clearAlerts should empty the alerts array', () => {
      performanceMonitor.addAlert({ type: 'memory', severity: 'low', message: 'm', value:0, threshold:0, timestamp:0 });
      performanceMonitor.clearAlerts();
      expect(performanceMonitor.getAlerts().length).toBe(0);
    });

    it('generateReport should return a string report', () => {
        jest.advanceTimersByTime(5000);
        const report = performanceMonitor.generateReport();
        expect(typeof report).toBe('string');
        expect(report).toContain('Performance Report');
    });

    it('cleanup should stop monitoring and clear data', () => {
      jest.advanceTimersByTime(5000);
      performanceMonitor.measureOperation(() => {}, 'renderTime');
      performanceMonitor.addAlert({ type: 'memory', severity: 'low', message: 'm', value:0, threshold:0, timestamp:0 });

      const stopMonitoringSpy = jest.spyOn(performanceMonitor, 'stopMonitoring');
      performanceMonitor.cleanup();

      expect(stopMonitoringSpy).toHaveBeenCalled();
      expect(performanceMonitor.getMetrics().length).toBe(0);
      expect(performanceMonitor.getAlerts().length).toBe(0);
      // recentOperations is not explicitly cleared in cleanup in the SUT's cleanup method
      // expect(performanceMonitor.getRecentOperations().length).toBe(0);
    });
  });
});
