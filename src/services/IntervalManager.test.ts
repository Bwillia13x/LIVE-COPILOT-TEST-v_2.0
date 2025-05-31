// src/services/IntervalManager.test.ts
import { IntervalManager, TimerConfig, TimerInfo } from './IntervalManager'; // Assuming TimerInfo might be useful for assertions
// Import types for mocked services
import { LoggerService as LoggerServiceType, MemoryManager as MemoryManagerType } from '../utils';

// Module-scoped variables to hold the mock instances, retrieved in beforeEach
let mockLoggerServiceInstance: {
  debug: jest.Mock; info: jest.Mock; error: jest.Mock; warn: jest.Mock;
};
let mockMemoryManagerInstance: {
  trackInterval: jest.Mock; clearInterval: jest.Mock; trackTimeout: jest.Mock; clearTimeout: jest.Mock;
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
    trackTimeout: jest.fn(),
    clearTimeout: jest.fn(),
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


describe('IntervalManager', () => {
  let intervalManager: IntervalManager;
  let mockDateNow: jest.SpyInstance;
  let mockAddEventListener: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Retrieve the mock instances that will be used by the service by calling getInstance
    // from the mocked '../utils' module.
    const MockedUtils = require('../utils'); // This gets the mocked module
    mockLoggerServiceInstance = MockedUtils.LoggerService.getInstance();
    mockMemoryManagerInstance = MockedUtils.MemoryManager.getInstance();

    // Clear all methods on these retrieved mock instances
    Object.values(mockLoggerServiceInstance).forEach(mockFn => (mockFn as jest.Mock).mockClear());
    Object.values(mockMemoryManagerInstance).forEach(mockFn => (mockFn as jest.Mock).mockClear());

    // Clear the getInstance mocks themselves (to check how many times they are called by the service, if needed)
    MockedUtils.LoggerService.getInstance.mockClear();
    MockedUtils.MemoryManager.getInstance.mockClear();

    // Mock Date.now() for consistent timestamps
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000000000); // A fixed start time

    // Mock window.addEventListener for 'beforeunload'
    mockAddEventListener = jest.spyOn(window, 'addEventListener');

    // Force re-creation of IntervalManager singleton for cleaner tests
    if ((IntervalManager as any).instance) {
        (IntervalManager as any).instance.cleanup();
        (IntervalManager as any).instance = undefined;
    }
    intervalManager = IntervalManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
    intervalManager.cleanup();
    mockDateNow.mockRestore();
    mockAddEventListener.mockRestore();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('getInstance should return the same instance', () => {
    const instance1 = IntervalManager.getInstance();
    const instance2 = IntervalManager.getInstance();
    expect(instance1).toBe(instance2);
    // And it should be the same as the one in `beforeEach`
    expect(instance1).toBe(intervalManager);
  });

  it('constructor should add beforeunload event listener for cleanup', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  describe('createInterval', () => {
    let onExecute: jest.Mock;
    let onError: jest.Mock;
    let onComplete: jest.Mock;

    beforeEach(() => {
      onExecute = jest.fn();
      onError = jest.fn();
      onComplete = jest.fn();
    });

    it('should create and execute an interval', () => {
      const config: TimerConfig = { interval: 100, onExecute: onExecute as any }; // Cast for now, or update mock sig
      const id = intervalManager.createInterval(config);

      expect(id).toBeGreaterThan(0);
      expect(mockMemoryManagerInstance.trackInterval).toHaveBeenCalledWith(id);
      expect(onExecute).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(2);
    });

    it('should execute immediately if immediate is true', () => {
      const config: TimerConfig = { interval: 100, onExecute: onExecute as any, immediate: true };
      intervalManager.createInterval(config);
      expect(onExecute).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(2);
    });

    it('should stop after maxExecutions and call onComplete', async () => { // Added async
      const config: TimerConfig = { interval: 100, onExecute: onExecute as any, maxExecutions: 2, onComplete };
      intervalManager.createInterval(config);

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(2);
      // Allow microtasks to settle, like onComplete if it's queued
      await Promise.resolve();
      expect(onComplete).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(2);
    });

    it('should call onError if onExecute throws', async () => {
      const error = new Error('Execute failed');
      onExecute.mockImplementationOnce(() => { throw error; });

      const config: TimerConfig = { interval: 100, onExecute: onExecute as any, onError, immediate: true };
      intervalManager.createInterval(config);

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(mockLoggerServiceInstance.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('clearInterval', () => {
    it('should clear an active interval', () => {
      const onExecute = jest.fn();
      const id = intervalManager.createInterval({ interval: 100, onExecute: onExecute as any });

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(1);

      const cleared = intervalManager.clearInterval(id);
      expect(cleared).toBe(true);
      expect(mockMemoryManagerInstance.clearInterval).toHaveBeenCalledWith(id);

      jest.advanceTimersByTime(100);
      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(intervalManager.getActiveTimers().find(t => t.id === id)).toBeUndefined();
    });

    it('should return false if intervalId does not exist or is not an interval', () => {
        expect(intervalManager.clearInterval(999)).toBe(false);
        const timeoutId = intervalManager.createTimeout(100, jest.fn());
        expect(intervalManager.clearInterval(timeoutId)).toBe(false);
    });
  });

  describe('createTimeout', () => {
    it('should create and execute a timeout', async () => { // Added async
      const onExecute = jest.fn();
      const id = intervalManager.createTimeout(200, onExecute);

      expect(id).toBeGreaterThan(0);
      expect(mockMemoryManagerInstance.trackTimeout).toHaveBeenCalledWith(id);
      expect(onExecute).not.toHaveBeenCalled();

      jest.advanceTimersByTime(199);
      expect(onExecute).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(onExecute).toHaveBeenCalledTimes(1);
      // Allow microtasks to settle, like the .delete() operation if it's in a promise chain
      await Promise.resolve();
      expect(intervalManager.getActiveTimers().find(t => t.id === id)).toBeUndefined();
    });

    it('should log error if callback throws', async () => {
      const error = new Error('Timeout failed');
      const onExecute = jest.fn().mockImplementationOnce(() => { throw error; });

      intervalManager.createTimeout(100, onExecute);
      jest.advanceTimersByTime(100);

      expect(onExecute).toHaveBeenCalledTimes(1);
      expect(mockLoggerServiceInstance.error).toHaveBeenCalledWith(expect.stringContaining('execution failed'), error);
    });
  });

  describe('clearTimeout', () => {
    it('should clear an active timeout', () => {
      const onExecute = jest.fn();
      const id = intervalManager.createTimeout(100, onExecute);

      jest.advanceTimersByTime(50);
      const cleared = intervalManager.clearTimeout(id);
      expect(cleared).toBe(true);
      expect(mockMemoryManagerInstance.clearTimeout).toHaveBeenCalledWith(id);

      jest.advanceTimersByTime(50);
      expect(onExecute).not.toHaveBeenCalled();
      expect(intervalManager.getActiveTimers().find(t => t.id === id)).toBeUndefined();
    });

    it('should return false if timeoutId does not exist or is not a timeout', () => {
        expect(intervalManager.clearTimeout(999)).toBe(false);
        const intervalId = intervalManager.createInterval({ interval: 100, onExecute: jest.fn() as any });
        expect(intervalManager.clearTimeout(intervalId)).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    describe('createRecurringTask', () => {
        it('should create an interval with default error handling', () => {
            const task = jest.fn();
            // The task in createRecurringTask will receive timerId, but may not use it.
            intervalManager.createRecurringTask('myTask', 100, task as any, { immediate: true });
            expect(task).toHaveBeenCalledTimes(1);
        });
    });

    describe('createDelayedTask', () => {
        it('should create a timeout with error handling', () => {
            const task = jest.fn();
            intervalManager.createDelayedTask('myDelayedTask', 100, task);
            jest.advanceTimersByTime(100);
            expect(task).toHaveBeenCalledTimes(1);
        });
    });

    describe('createRetryTask', () => {
        let taskToRetry: jest.Mock;
        let onSuccess: jest.Mock;
        let onFailure: jest.Mock;

        beforeEach(() => {
            taskToRetry = jest.fn();
            onSuccess = jest.fn();
            onFailure = jest.fn();
        });

        it('succeeds on first try', async () => {
            taskToRetry.mockResolvedValue(true);
            const retryOptions = { interval: 10, maxRetries: 3, onSuccess, onFailure };
            intervalManager.createRetryTask('retryTest', taskToRetry, retryOptions);

            jest.advanceTimersByTime(0); // For immediate execution (due to immediate: true in createInterval)
            await Promise.resolve(); // Allow promises from onExecute and task to settle

            expect(taskToRetry).toHaveBeenCalledTimes(1);
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(onFailure).not.toHaveBeenCalled();
        });

        it('succeeds after a few retries', async () => {
            taskToRetry.mockResolvedValueOnce(false)
                       .mockResolvedValueOnce(false)
                       .mockResolvedValueOnce(true);
            const retryOptions = { interval: 10, maxRetries: 3, onSuccess, onFailure };
            intervalManager.createRetryTask('retryTest', taskToRetry, retryOptions);

            jest.advanceTimersByTime(0); // Immediate, try 1 (false)
            await Promise.resolve();
            expect(taskToRetry).toHaveBeenCalledTimes(1);
            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(retryOptions.interval); // Interval, try 2 (false)
            await Promise.resolve();
            expect(taskToRetry).toHaveBeenCalledTimes(2);
            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(retryOptions.interval); // Interval, try 3 (true)
            await Promise.resolve();
            expect(taskToRetry).toHaveBeenCalledTimes(3);
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(onFailure).not.toHaveBeenCalled();
        });

        it('fails after max retries', async () => {
            taskToRetry.mockResolvedValue(false); // Always fails
            const retryOptions = { interval: 10, maxRetries: 2, onSuccess, onFailure };
            intervalManager.createRetryTask('retryTest', taskToRetry, retryOptions);

            jest.advanceTimersByTime(0); // Immediate, try 1
            await Promise.resolve();
            expect(taskToRetry).toHaveBeenCalledTimes(1);
            expect(onFailure).not.toHaveBeenCalled(); // Not yet failed completely

            jest.advanceTimersByTime(retryOptions.interval); // Interval, try 2 (maxRetries reached)
            await Promise.resolve();
            expect(taskToRetry).toHaveBeenCalledTimes(2);
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onFailure).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('clearAll / cleanup', () => {
    it('should clear all active timers', () => {
      const intCb = jest.fn();
      const toCb = jest.fn();
      intervalManager.createInterval({ interval: 50, onExecute: intCb as any });
      intervalManager.createTimeout(50, toCb);

      expect(intervalManager.getActiveTimers().length).toBe(2);
      intervalManager.clearAll();

      expect(intervalManager.getActiveTimers().length).toBe(0);
      jest.advanceTimersByTime(50);
      expect(intCb).not.toHaveBeenCalled();
      expect(toCb).not.toHaveBeenCalled();
    });
  });

  describe('Stats Methods', () => {
    it('getActiveTimers should return active timers', () => {
        const id1 = intervalManager.createInterval({ interval: 100, onExecute: jest.fn() as any });
        intervalManager.createTimeout(100, jest.fn());
        expect(intervalManager.getActiveTimers().length).toBe(2);
        intervalManager.clearInterval(id1);
        expect(intervalManager.getActiveTimers().length).toBe(1);
    });

    it('getTimerStats should return correct stats', () => {
        mockDateNow.mockReturnValue(1000);
        intervalManager.createInterval({ interval: 100, onExecute: jest.fn() as any, immediate: true });
        mockDateNow.mockReturnValue(1050);
        intervalManager.createTimeout(200, jest.fn());
        mockDateNow.mockReturnValue(1100);

        const stats = intervalManager.getTimerStats();
        expect(stats.total).toBe(2);
        expect(stats.intervals).toBe(1);
        expect(stats.timeouts).toBe(1);
    expect(stats.oldestTimer).toBe(50); // Corrected: timeout created at 1050, interval at 1000. Current time 1100. Min age is 50.
        expect(stats.totalExecutions).toBe(1);
    });

    it('getPerformanceReport should generate a report string', () => {
        const initialTime = 1000000000000;
        mockDateNow.mockReturnValue(initialTime);
        intervalManager.createInterval({ interval: 50, onExecute: jest.fn() as any });

        mockDateNow.mockReturnValue(initialTime - 70000);
        intervalManager.createInterval({ interval: 10000, onExecute: jest.fn() as any });

        mockDateNow.mockReturnValue(initialTime); // Reset to "current" time for report generation

        const report = intervalManager.getPerformanceReport();
        expect(report).toContain('Total Active Timers: 2');
        expect(report).toContain('Long-running Timers: 1');
        expect(report).toContain('High-frequency Timers: 1');
    });
  });
});
