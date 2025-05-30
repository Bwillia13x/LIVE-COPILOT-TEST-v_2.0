/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { APP_CONFIG, LOG_LEVELS, ENV, type LogLevel } from './constants.js';

/**
 * Centralized logging service with different levels and environment-aware output
 */
export class LoggerService {
  private static instance: LoggerService;
  private currentLevel: LogLevel = ENV.IS_DEVELOPMENT ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  private logHistory: Array<{timestamp: number, level: LogLevel, message: string, data?: any}> = [];
  private readonly maxHistorySize = 1000;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  public error(message: string, data?: any): void {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  public debug(message: string, data?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level <= this.currentLevel) {
      const timestamp = Date.now();
      const logEntry = { timestamp, level, message, data };
      
      // Add to history
      this.logHistory.push(logEntry);
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.shift();
      }

      // Only output to console in development or for errors/warnings
      if (ENV.IS_DEVELOPMENT || level <= LOG_LEVELS.WARN) {
        const prefix = this.getLevelPrefix(level);
        const timeStr = new Date(timestamp).toLocaleTimeString();
        
        if (data) {
          console.log(`[${timeStr}] ${prefix} ${message}`, data);
        } else {
          console.log(`[${timeStr}] ${prefix} ${message}`);
        }
      }
    }
  }

  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case LOG_LEVELS.ERROR: return '❌';
      case LOG_LEVELS.WARN: return '⚠️';
      case LOG_LEVELS.INFO: return 'ℹ️';
      case LOG_LEVELS.DEBUG: return '🐛';
      default: return '';
    }
  }

  public getHistory(): Array<{timestamp: number, level: LogLevel, message: string, data?: any}> {
    return [...this.logHistory];
  }

  public clearHistory(): void {
    this.logHistory = [];
  }

  public exportLogs(): string {
    return this.logHistory
      .map(entry => {
        const time = new Date(entry.timestamp).toISOString();
        const level = Object.keys(LOG_LEVELS)[entry.level];
        const data = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
        return `${time} [${level}] ${entry.message}${data}`;
      })
      .join('\n');
  }
}

/**
 * Memory management utility to track and prevent memory leaks
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private trackedObjects = new WeakSet();
  private intervals = new Set<number>();
  private timeouts = new Set<number>();
  private eventListeners = new Map<Element, Array<{event: string, handler: EventListener}>>();
  private logger = LoggerService.getInstance();

  private constructor() {
    // Set up cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // Periodic memory monitoring
    setInterval(() => this.monitorMemory(), APP_CONFIG.PERFORMANCE.CLEANUP_INTERVAL);
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public trackInterval(intervalId: number): void {
    this.intervals.add(intervalId);
    this.logger.debug(`Tracking interval: ${intervalId}`);
  }

  public clearInterval(intervalId: number): void {
    if (this.intervals.has(intervalId)) {
      window.clearInterval(intervalId);
      this.intervals.delete(intervalId);
      this.logger.debug(`Cleared interval: ${intervalId}`);
    }
  }

  public trackTimeout(timeoutId: number): void {
    this.timeouts.add(timeoutId);
    this.logger.debug(`Tracking timeout: ${timeoutId}`);
  }

  public clearTimeout(timeoutId: number): void {
    if (this.timeouts.has(timeoutId)) {
      window.clearTimeout(timeoutId);
      this.timeouts.delete(timeoutId);
      this.logger.debug(`Cleared timeout: ${timeoutId}`);
    }
  }

  public trackEventListener(element: Element, event: string, handler: EventListener): void {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element)!.push({ event, handler });
    this.logger.debug(`Tracking event listener: ${event} on ${element.tagName}`);
  }

  public removeEventListener(element: Element, event: string, handler: EventListener): void {
    const listeners = this.eventListeners.get(element);
    if (listeners) {
      const index = listeners.findIndex(l => l.event === event && l.handler === handler);
      if (index !== -1) {
        element.removeEventListener(event, handler);
        listeners.splice(index, 1);
        this.logger.debug(`Removed event listener: ${event} from ${element.tagName}`);
        
        if (listeners.length === 0) {
          this.eventListeners.delete(element);
        }
      }
    }
  }

  public cleanup(): void {
    this.logger.info('Starting memory cleanup...');
    
    // Clear all tracked intervals
    this.intervals.forEach(intervalId => {
      window.clearInterval(intervalId);
    });
    this.intervals.clear();
    
    // Clear all tracked timeouts
    this.timeouts.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    this.timeouts.clear();
    
    // Remove all tracked event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventListeners.clear();
    
    this.logger.info('Memory cleanup completed');
  }

  private monitorMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      this.logger.debug(`Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
      
      if (usedMB > APP_CONFIG.PERFORMANCE.MAX_MEMORY_USAGE / 1024 / 1024) {
        this.logger.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
      }
    }
  }

  public getStats(): {intervals: number, timeouts: number, eventListeners: number} {
    return {
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      eventListeners: this.eventListeners.size
    };
  }
}

/**
 * Enhanced error handling with retry logic and proper error classification
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger = LoggerService.getInstance();
  private retryAttempts = new Map<string, number>();

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public async handleAsync<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      maxRetries?: number;
      retryDelay?: number;
      fallback?: () => T | Promise<T>;
    }
  ): Promise<T> {
    const { operationName, maxRetries = APP_CONFIG.RETRY.MAX_ATTEMPTS, retryDelay = APP_CONFIG.RETRY.BACKOFF_BASE } = context;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset retry count on success
        this.retryAttempts.delete(operationName);
        
        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
        
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(APP_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
          await this.delay(delay);
        }
      }
    }
    
    // All attempts failed
    this.retryAttempts.set(operationName, maxRetries);
    this.logger.error(`${operationName} failed after ${maxRetries} attempts`, lastError!);
    
    if (context.fallback) {
      this.logger.info(`Using fallback for ${operationName}`);
      return await context.fallback();
    }
    
    throw lastError!;
  }

  public handleSync<T>(operation: () => T, context: { operationName: string; fallback?: () => T }): T {
    try {
      return operation();
    } catch (error) {
      this.logger.error(`${context.operationName} failed: ${(error as Error).message}`, error);
      
      if (context.fallback) {
        this.logger.info(`Using fallback for ${context.operationName}`);
        return context.fallback();
      }
      
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public isNetworkError(error: Error): boolean {
    const networkErrorPatterns = [
      'network',
      'timeout',
      'fetch',
      'connection',
      'cors',
      'offline'
    ];
    
    const message = error.message.toLowerCase();
    return networkErrorPatterns.some(pattern => message.includes(pattern));
  }

  public getRetryCount(operationName: string): number {
    return this.retryAttempts.get(operationName) || 0;
  }

  /**
   * Static method for simple error logging - provides backward compatibility
   */
  public static logError(message: string, error?: Error | unknown): void {
    const instance = ErrorHandler.getInstance();
    const errorObj = error instanceof Error ? error : new Error(String(error));
    instance.logger.error(message, errorObj);
  }

  /**
   * Instance method for comprehensive error handling
   */
  public handleError(error: Error, context: { operationName: string; fallback?: () => any }): void {
    this.logger.error(`${context.operationName} failed: ${error.message}`, error);
    
    if (context.fallback) {
      this.logger.info(`Using fallback for ${context.operationName}`);
      return context.fallback();
    }
  }
}

/**
 * Utility functions for debouncing and throttling
 */
export class PerformanceUtils {
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func.apply(null, args), delay);
    };
  }

  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: number;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      } else {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          func.apply(null, args);
        }, delay - (now - lastCall));
      }
    };
  }

  public static memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = func.apply(null, args);
      cache.set(key, result);
      
      return result;
    }) as T;
  }
}
