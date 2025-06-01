import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    formatFileSize,
    ErrorHandler,
    LoggerService,
    showToast
} from '../../src/utils';
import { UTIL_CONFIG, APP_CONFIG, LOG_LEVELS, ENV } from '../../src/constants';
import { ToastOptions } from '../../src/types';

describe('formatFileSize', () => {
  it('should return "0 Bytes" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('should format bytes correctly (whole numbers without decimal)', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB'); // 1.0 KB
    expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
    expect(formatFileSize(1024 * 500)).toBe('500.0 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB'); // 1.0 MB
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB'); // 1.0 GB
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });

  it('should format terabytes correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB'); // 1.0 TB
    expect(formatFileSize(3.5 * 1024 * 1024 * 1024 * 1024)).toBe('3.5 TB');
  });

  it('should handle negative numbers by returning "0 Bytes"', () => {
    expect(formatFileSize(-100)).toBe('0 Bytes');
  });

  it('should handle large numbers within TB range', () => {
    expect(formatFileSize(5.67 * 1024 * 1024 * 1024 * 1024)).toBe('5.7 TB');
  });

  it('should handle edge case just below KB (whole number without decimal)', () => {
    expect(formatFileSize(1023)).toBe('1023 Bytes');
  });

  it('should handle small byte values (less than 1)', () => {
    expect(formatFileSize(0.5)).toBe('0.5 Bytes');
  });
});

describe('ErrorHandler', () => {
  let errorHandlerInstance: ErrorHandler;

  beforeEach(() => {
    errorHandlerInstance = ErrorHandler.getInstance();
  });

  describe('isNetworkError', () => {
    it('should return true for common network error messages', () => {
      UTIL_CONFIG.NETWORK_ERROR_PATTERNS.forEach(pattern => {
        expect(errorHandlerInstance.isNetworkError(new Error(`Something related to ${pattern} happened`))).toBe(true);
      });
      expect(errorHandlerInstance.isNetworkError(new Error("Failed to fetch"))).toBe(true);
      expect(errorHandlerInstance.isNetworkError(new Error("NetworkError when attempting to fetch resource."))).toBe(true);
      // The pattern "load" should catch "Load failed"
      expect(errorHandlerInstance.isNetworkError(new Error("Load failed"))).toBe(true);
      expect(errorHandlerInstance.isNetworkError(new Error("The operation was aborted. AbortError"))).toBe(false);
      expect(errorHandlerInstance.isNetworkError(new Error("A network error occurred."))).toBe(true);
      expect(errorHandlerInstance.isNetworkError(new Error("Offline"))).toBe(true);
      expect(errorHandlerInstance.isNetworkError(new Error("Connection refused"))).toBe(true);
    });

    it('should return false for non-network error messages', () => {
      expect(errorHandlerInstance.isNetworkError(new Error("Some other error"))).toBe(false);
      expect(errorHandlerInstance.isNetworkError(new Error("NullReferenceException"))).toBe(false);
      expect(errorHandlerInstance.isNetworkError(new Error("TypeError: x is not a function"))).toBe(false);
    });

    it('should return false for null or undefined inputs to isNetworkError', () => {
      expect(errorHandlerInstance.isNetworkError(null)).toBe(false);
      expect(errorHandlerInstance.isNetworkError(undefined)).toBe(false);
    });

    it('should be case-insensitive for network error messages', () => {
      expect(errorHandlerInstance.isNetworkError(new Error("failed to FETCH"))).toBe(true);
      expect(errorHandlerInstance.isNetworkError(new Error("NETWORK error"))).toBe(true);
    });
  });
});

describe('LoggerService', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = LoggerService.getInstance();
    logger.clearHistory();
    logger.setLevel(LOG_LEVELS.DEBUG);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error messages to history', () => {
    logger.error('Test error message', { detail: 'error data' });
    const history = logger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].message).toBe('Test error message');
    expect(history[0].level).toBe(LOG_LEVELS.ERROR);
    expect(history[0].data).toEqual({ detail: 'error data' });
  });

  it('should log warn messages to history', () => {
    logger.warn('Test warn message');
    const history = logger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].message).toBe('Test warn message');
    expect(history[0].level).toBe(LOG_LEVELS.WARN);
  });

  it('should log info messages to history when level is DEBUG or INFO', () => {
    logger.setLevel(LOG_LEVELS.INFO);
    logger.info('Test info message');
    const history = logger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].message).toBe('Test info message');
    expect(history[0].level).toBe(LOG_LEVELS.INFO);
  });

  it('should log debug messages to history when level is DEBUG', () => {
    logger.setLevel(LOG_LEVELS.DEBUG);
    logger.debug('Test debug message');
    const history = logger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].message).toBe('Test debug message');
    expect(history[0].level).toBe(LOG_LEVELS.DEBUG);
  });

  it('should not log info messages if level is WARN', () => {
    logger.setLevel(LOG_LEVELS.WARN);
    logger.info('This should not be logged to history');
    expect(logger.getHistory().length).toBe(0);
  });

  it('should not log debug messages if level is INFO', () => {
    logger.setLevel(LOG_LEVELS.INFO);
    logger.debug('This should not be logged to history');
    expect(logger.getHistory().length).toBe(0);
  });

  it('should respect maxHistorySize', () => {
    const maxHistory = UTIL_CONFIG.LOGGER_MAX_HISTORY;
    for (let i = 0; i < maxHistory + 5; i++) {
      logger.info(`message ${i}`);
    }
    expect(logger.getHistory().length).toBe(maxHistory);
    expect(logger.getHistory()[0].message).toBe('message 5');
  });

  it('should clear history', () => {
    logger.info('A message to be cleared');
    logger.clearHistory();
    expect(logger.getHistory().length).toBe(0);
  });

  it('should export logs correctly', () => {
    logger.info('First log for export');
    logger.error('Second log for export', {data: 'some data'});
    const exportedLogs = logger.exportLogs();
    expect(exportedLogs).toContain('First log for export');
    expect(exportedLogs).toContain('Second log for export');
    expect(exportedLogs).toContain('[INFO]');
    expect(exportedLogs).toContain('[ERROR]');
    expect(exportedLogs).toContain('{"data":"some data"}');
  });
});

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should create and append a toast message element to document.body', () => {
    const options: ToastOptions = { type: 'success', title: 'Success!', message: 'Operation completed.' };
    showToast(options);

    const toastElement = document.body.querySelector('.toast.toast-success');
    expect(toastElement).not.toBeNull();
    if (toastElement) {
      expect(toastElement.querySelector('.toast-title')?.textContent).toBe(options.title);
      expect(toastElement.querySelector('.toast-message')?.textContent).toBe(options.message);
    }
  });

  it('should remove the toast after the default duration', () => {
    const options: ToastOptions = { type: 'info', title: 'Info', message: 'Please wait...' };
    showToast(options);

    let toastElement = document.body.querySelector('.toast.toast-info');
    expect(toastElement).not.toBeNull();

    vi.advanceTimersByTime(APP_CONFIG.TIMING.TOAST_DURATION);

    toastElement = document.body.querySelector('.toast.toast-info');
    expect(toastElement).toBeNull();
  });

  it('should remove the toast after a custom duration if provided', () => {
    const customDuration = 1000;
    const options: ToastOptions = { type: 'warning', title: 'Careful', message: 'Proceed with caution.', duration: customDuration };
    showToast(options);

    let toastElement = document.body.querySelector('.toast.toast-warning');
    expect(toastElement).not.toBeNull();

    vi.advanceTimersByTime(customDuration);

    toastElement = document.body.querySelector('.toast.toast-warning');
    expect(toastElement).toBeNull();
  });

  it('should apply correct class based on toast type', () => {
    const errorOptions: ToastOptions = { type: 'error', title: 'Error', message: 'Something went wrong.' };
    showToast(errorOptions);
    expect(document.body.querySelector('.toast.toast-error')).not.toBeNull();
    document.body.innerHTML = '';

    const warningOptions: ToastOptions = { type: 'warning', title: 'Warning', message: 'Check this.' };
    showToast(warningOptions);
    expect(document.body.querySelector('.toast.toast-warning')).not.toBeNull();
  });
});
