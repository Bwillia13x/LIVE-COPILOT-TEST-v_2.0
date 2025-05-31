/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerService, MemoryManager } from '../utils';

export interface TimerConfig {
  interval: number;
  immediate?: boolean;
  maxExecutions?: number;
  onExecute: (timerId: number) => void | Promise<void>; // Added timerId parameter
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
    const internalId = this.nextId++; // Our internal ID for logging/distinction if needed
    const now = Date.now();

    // timerInfo will be mutated with the browser's intervalId later
    const timerInfo: TimerInfo = {
      id: 0, // Placeholder, will be updated to browserIntervalId
      type: 'interval',
      config,
      executionCount: 0,
      created: now,
      isActive: true
    };

    // Create the actual interval
    const executeFunction = async () => {
      // Check isActive at the very beginning. If cleared, especially by maxExecutions, do nothing.
      if (!timerInfo.isActive) return;

      try {
        timerInfo.executionCount++; // Increment before execution for accurate count
        timerInfo.lastExecution = Date.now();
        
        await config.onExecute(timerInfo.id); // Pass browserIntervalId (timerInfo.id)

        // Check if we've reached max executions AFTER current execution
        // Only proceed if timer is still active (not cleared by onExecute itself)
        if (timerInfo.isActive && config.maxExecutions && timerInfo.executionCount >= config.maxExecutions) {
          // Pass browserIntervalId (which is timerInfo.id) to clearInterval
          this.clearInterval(timerInfo.id); // This will set timerInfo.isActive = false
          if (config.onComplete) {
            config.onComplete();
          }
          // No return needed here, as the isActive check at the top will handle future calls
          // if any were queued before clearInterval fully takes effect with fake timers.
        }
      } catch (error) {
        // Use timerInfo.id (browserId) or internalId for logging
        this.logger.error(`Timer ${timerInfo.id} (internal: ${internalId}) execution failed:`, error);
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
    const browserIntervalId = window.setInterval(executeFunction, config.interval);
    timerInfo.id = browserIntervalId; // Update timerInfo with the actual browser ID
    
    // Track with memory manager
    this.memoryManager.trackInterval(browserIntervalId);
    
    // Store the direct reference to timerInfo, keyed by browserIntervalId
    this.timers.set(browserIntervalId, timerInfo);

    this.logger.debug(`Created interval (internal: ${internalId}, browser: ${browserIntervalId}) with ${config.interval}ms interval`);
    return browserIntervalId;
  }

  public createTimeout(delay: number, callback: () => void | Promise<void>): number {
    const internalId = this.nextId++;
    const now = Date.now();

    const timerInfo: TimerInfo = {
      id: 0, // Placeholder, will be updated to browserTimeoutId
      type: 'timeout',
      config: {
        interval: delay, // delay is used as interval for consistency in TimerConfig
        maxExecutions: 1,
        onExecute: callback,
      },
      executionCount: 0,
      created: now,
      isActive: true,
    };

    const executeFunction = async () => {
      if (!timerInfo.isActive) return; // This timerInfo is from the closure

      try {
        timerInfo.executionCount++;
        timerInfo.lastExecution = Date.now();
        
        await callback();
        
      } catch (error) {
        this.logger.error(`Timeout ${timerInfo.id} (internal: ${internalId}) execution failed:`, error);
      } finally {
        // Ensure state is updated and timer is removed
        timerInfo.isActive = false;
        this.timers.delete(timerInfo.id); // Use browserTimeoutId (timerInfo.id)
      }
    };

    const browserTimeoutId = window.setTimeout(executeFunction, delay);
    timerInfo.id = browserTimeoutId; // Update timerInfo with the actual browser ID
    
    // Track with memory manager
    this.memoryManager.trackTimeout(browserTimeoutId);
    
    // Store the direct reference to timerInfo, keyed by browserTimeoutId
    this.timers.set(browserTimeoutId, timerInfo);

    this.logger.debug(`Created timeout (internal: ${internalId}, browser: ${browserTimeoutId}) with ${delay}ms delay`);
    return browserTimeoutId;
  }

  public clearInterval(intervalId: number): boolean { // intervalId here is browserIntervalId
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
    task: (timerId?: number) => void | Promise<void>, // Task might need timerId if it self-clears
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
    let taskSucceeded = false;
    
    // Capture the interval ID so it can be cleared by its own onExecute
    let intervalIdForRetry: number | null = null;

    const intervalConfig: TimerConfig = {
      interval: options.interval,
      immediate: true,
      onExecute: async (timerId) => { // onExecute now receives timerId
        if (taskSucceeded) return;

        retryCount++;
        const success = await task(timerId); // Pass timerId to task if it needs it
        
        if (success) {
          taskSucceeded = true;
          this.logger.info(`Retry task "${taskName}" succeeded after ${retryCount} attempts`);
          if (options.onSuccess) options.onSuccess();
          this.clearInterval(timerId); // Clear itself using the passed timerId
          return;
        }
        
        // This part is only reached if not successful yet (and not cleared)
        if (retryCount >= options.maxRetries) {
          this.logger.warn(`Retry task "${taskName}" failed after ${retryCount} attempts`);
          if (options.onFailure) options.onFailure();
          // Explicitly clear the interval here as well to ensure it stops immediately.
          // maxExecutions would also stop it, but this is more deterministic for runAllTimersAsync.
          this.clearInterval(timerId);
        }
      },
      maxExecutions: options.maxRetries,
      onComplete: () => { // This onComplete is for the interval itself
        if (!taskSucceeded && retryCount >= options.maxRetries) {
            // This path is hit if maxRetries is reached and the task had not succeeded.
            // onFailure should have already been called by onExecute in this case.
            this.logger.debug(`Retry task "${taskName}" interval completed after max retries (task failed).`);
        } else if (taskSucceeded) {
            this.logger.debug(`Retry task "${taskName}" interval completed (task succeeded).`);
        }
      }
    };

    intervalIdForRetry = this.createInterval(intervalConfig);
    return intervalIdForRetry;
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
