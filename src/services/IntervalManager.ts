/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerService, MemoryManager } from '../utils.js';

export interface TimerConfig {
  interval: number;
  immediate?: boolean;
  maxExecutions?: number;
  onExecute: () => void | Promise<void>;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface TimerInfo {
  id: number;
  type: 'interval' | 'timeout';
  config: TimerConfig;
  executionCount: number;
  created: number;
  lastExecution?: number;
  isActive: boolean;
}

export class IntervalManager {
  private static instance: IntervalManager;
  private logger = LoggerService.getInstance();
  private memoryManager = MemoryManager.getInstance();
  private timers = new Map<number, TimerInfo>();
  private nextId = 1;

  private constructor() {
    // Clean up timers on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  public static getInstance(): IntervalManager {
    if (!IntervalManager.instance) {
      IntervalManager.instance = new IntervalManager();
    }
    return IntervalManager.instance;
  }

  public createInterval(config: TimerConfig): number {
    const id = this.nextId++;
    const now = Date.now();

    const timerInfo: TimerInfo = {
      id,
      type: 'interval',
      config,
      executionCount: 0,
      created: now,
      isActive: true,
    };

    // Create the actual interval
    const executeFunction = async () => {
      if (!timerInfo.isActive) return;

      try {
        timerInfo.executionCount++;
        timerInfo.lastExecution = Date.now();
        
        await config.onExecute();

        // Check if we've reached max executions
        if (config.maxExecutions && timerInfo.executionCount >= config.maxExecutions) {
          this.clearInterval(id);
          if (config.onComplete) {
            config.onComplete();
          }
        }
      } catch (error) {
        this.logger.error(`Timer ${id} execution failed:`, error);
        if (config.onError) {
          config.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    // Execute immediately if requested
    if (config.immediate) {
      executeFunction();
    }

    // Create the interval
    const intervalId = window.setInterval(executeFunction, config.interval);
    
    // Track with memory manager
    this.memoryManager.trackInterval(intervalId);
    
    // Store timer info with the browser interval ID
    this.timers.set(intervalId, { ...timerInfo, id: intervalId });

    this.logger.debug(`Created interval ${intervalId} with ${config.interval}ms interval`);
    return intervalId;
  }

  public createTimeout(delay: number, callback: () => void | Promise<void>): number {
    const id = this.nextId++;
    const now = Date.now();

    const timerInfo: TimerInfo = {
      id,
      type: 'timeout',
      config: {
        interval: delay,
        maxExecutions: 1,
        onExecute: callback,
      },
      executionCount: 0,
      created: now,
      isActive: true,
    };

    const executeFunction = async () => {
      if (!timerInfo.isActive) return;

      try {
        timerInfo.executionCount++;
        timerInfo.lastExecution = Date.now();
        
        await callback();
        
        // Remove from tracking after execution
        this.timers.delete(timeoutId);
      } catch (error) {
        this.logger.error(`Timeout ${id} execution failed:`, error);
      }
    };

    const timeoutId = window.setTimeout(executeFunction, delay);
    
    // Track with memory manager
    this.memoryManager.trackTimeout(timeoutId);
    
    // Store timer info with the browser timeout ID
    this.timers.set(timeoutId, { ...timerInfo, id: timeoutId });

    this.logger.debug(`Created timeout ${timeoutId} with ${delay}ms delay`);
    return timeoutId;
  }

  public clearInterval(intervalId: number): boolean {
    const timerInfo = this.timers.get(intervalId);
    if (!timerInfo || timerInfo.type !== 'interval') {
      return false;
    }

    timerInfo.isActive = false;
    this.memoryManager.clearInterval(intervalId);
    this.timers.delete(intervalId);
    
    this.logger.debug(`Cleared interval ${intervalId}`);
    return true;
  }

  public clearTimeout(timeoutId: number): boolean {
    const timerInfo = this.timers.get(timeoutId);
    if (!timerInfo || timerInfo.type !== 'timeout') {
      return false;
    }

    timerInfo.isActive = false;
    this.memoryManager.clearTimeout(timeoutId);
    this.timers.delete(timeoutId);
    
    this.logger.debug(`Cleared timeout ${timeoutId}`);
    return true;
  }

  public clearAll(): void {
    const intervals = Array.from(this.timers.values()).filter(t => t.type === 'interval');
    const timeouts = Array.from(this.timers.values()).filter(t => t.type === 'timeout');

    intervals.forEach(timer => this.clearInterval(timer.id));
    timeouts.forEach(timer => this.clearTimeout(timer.id));

    this.logger.info(`Cleared ${intervals.length} intervals and ${timeouts.length} timeouts`);
  }

  public getActiveTimers(): TimerInfo[] {
    return Array.from(this.timers.values()).filter(timer => timer.isActive);
  }

  public getTimerStats(): {
    total: number;
    intervals: number;
    timeouts: number;
    oldestTimer: number | null;
    totalExecutions: number;
  } {
    const timers = this.getActiveTimers();
    const now = Date.now();
    
    return {
      total: timers.length,
      intervals: timers.filter(t => t.type === 'interval').length,
      timeouts: timers.filter(t => t.type === 'timeout').length,
      oldestTimer: timers.length > 0 ? Math.min(...timers.map(t => now - t.created)) : null,
      totalExecutions: timers.reduce((sum, t) => sum + t.executionCount, 0),
    };
  }

  public cleanup(): void {
    this.logger.info('Cleaning up all timers...');
    this.clearAll();
  }

  // Utility methods for common timer patterns
  public createRecurringTask(
    taskName: string,
    interval: number,
    task: () => void | Promise<void>,
    options: {
      immediate?: boolean;
      maxExecutions?: number;
      onError?: (error: Error) => void;
    } = {}
  ): number {
    this.logger.debug(`Creating recurring task: ${taskName}`);
    
    return this.createInterval({
      interval,
      immediate: options.immediate,
      maxExecutions: options.maxExecutions,
      onExecute: task,
      onError: options.onError || ((error) => {
        this.logger.error(`Recurring task "${taskName}" failed:`, error);
      }),
      onComplete: () => {
        this.logger.info(`Recurring task "${taskName}" completed`);
      },
    });
  }

  public createDelayedTask(
    taskName: string,
    delay: number,
    task: () => void | Promise<void>
  ): number {
    this.logger.debug(`Creating delayed task: ${taskName} (${delay}ms)`);
    
    return this.createTimeout(delay, async () => {
      try {
        await task();
        this.logger.debug(`Delayed task "${taskName}" completed`);
      } catch (error) {
        this.logger.error(`Delayed task "${taskName}" failed:`, error);
      }
    });
  }

  public createRetryTask(
    taskName: string,
    task: () => Promise<boolean>,
    options: {
      interval: number;
      maxRetries: number;
      onSuccess?: () => void;
      onFailure?: () => void;
    }
  ): number {
    let retryCount = 0;
    
    return this.createInterval({
      interval: options.interval,
      immediate: true,
      onExecute: async () => {
        retryCount++;
        const success = await task();
        
        if (success) {
          this.logger.info(`Retry task "${taskName}" succeeded after ${retryCount} attempts`);
          if (options.onSuccess) {
            options.onSuccess();
          }
          return; // This will be handled by maxExecutions
        }
        
        if (retryCount >= options.maxRetries) {
          this.logger.warn(`Retry task "${taskName}" failed after ${retryCount} attempts`);
          if (options.onFailure) {
            options.onFailure();
          }
        }
      },
      maxExecutions: options.maxRetries,
    });
  }

  // Performance monitoring helper
  public getPerformanceReport(): string {
    const stats = this.getTimerStats();
    const timers = this.getActiveTimers();
    
    const longRunningTimers = timers.filter(t => 
      Date.now() - t.created > 60000 // Running for more than 1 minute
    );
    
    const highFrequencyTimers = timers.filter(t => 
      t.type === 'interval' && t.config.interval < 1000 // Less than 1 second
    );

    return `
Timer Performance Report
========================
Total Active Timers: ${stats.total}
- Intervals: ${stats.intervals}
- Timeouts: ${stats.timeouts}

Long-running Timers: ${longRunningTimers.length}
High-frequency Timers: ${highFrequencyTimers.length}

Total Executions: ${stats.totalExecutions}
Oldest Timer Age: ${stats.oldestTimer ? Math.round(stats.oldestTimer / 1000) : 0}s

${longRunningTimers.length > 0 ? `
Warning: ${longRunningTimers.length} timer(s) have been running for over 1 minute.
` : ''}

${highFrequencyTimers.length > 0 ? `
Notice: ${highFrequencyTimers.length} timer(s) are running at high frequency (< 1s interval).
` : ''}
    `.trim();
  }
}
