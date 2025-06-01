/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerService, MemoryManager } from '../utils.js';
import { PerformanceWithMemory, LayoutShiftEntry } from '../types/index.js'; // Import new types

export interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  apiResponseTime: number;
  chartRenderTime: number;
  audioLatency: number;
  activeTimers: number;
  activeListeners: number;
}

export interface PerformanceAlert {
  type: 'memory' | 'latency' | 'resource' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logger = LoggerService.getInstance();
  private memoryManager = MemoryManager.getInstance();
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: number | null = null;
  private readonly maxMetricsHistory = 100;
  
  private readonly thresholds = {
    memory: 100 * 1024 * 1024, // 100MB
    renderTime: 100, // 100ms
    apiResponseTime: 5000, // 5 seconds
    chartRenderTime: 200, // 200ms
    audioLatency: 150, // 150ms
    maxTimers: 50,
    maxListeners: 100,
  };

  private recentOperations: { name: string; duration: number }[] = [];

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, 5000);

    this.memoryManager.trackInterval(this.monitoringInterval);
    this.logger.info('Performance monitoring started');
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      this.memoryManager.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Performance monitoring stopped');
    }
  }

  private collectMetrics(): void {
    const memoryUsage = this.getMemoryUsage();
    const stats = this.memoryManager.getStats();

    const metrics: PerformanceMetrics = {
      memoryUsage,
      renderTime: 0,
      apiResponseTime: 0,
      chartRenderTime: 0,
      audioLatency: 0,
      activeTimers: stats.intervals + stats.timeouts,
      activeListeners: stats.eventListeners,
    };

    this.metrics.push(metrics);
    
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    this.checkThresholds(metrics);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      // Use the PerformanceWithMemory type assertion
      return (performance as PerformanceWithMemory).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    const timestamp = Date.now();

    if (metrics.memoryUsage > this.thresholds.memory) {
      this.addAlert({
        type: 'memory',
        severity: this.getSeverity(metrics.memoryUsage, this.thresholds.memory),
        message: `High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.memory,
        timestamp,
      });
    }

    if (metrics.activeTimers > this.thresholds.maxTimers) {
      this.addAlert({
        type: 'resource',
        severity: 'medium',
        message: `Too many active timers: ${metrics.activeTimers}`,
        value: metrics.activeTimers,
        threshold: this.thresholds.maxTimers,
        timestamp,
      });
    }

    if (metrics.activeListeners > this.thresholds.maxListeners) {
      this.addAlert({
        type: 'resource',
        severity: 'medium',
        message: `Too many event listeners: ${metrics.activeListeners}`,
        value: metrics.activeListeners,
        threshold: this.thresholds.maxListeners,
        timestamp,
      });
    }
  }

  private getSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > 50) { // Consider making 50 a constant
      this.alerts.shift();
    }
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.logger.warn(`Performance Alert [${alert.severity}]: ${alert.message}`);
    }
  }

  public getRecentOperations(): { name: string; duration: number }[] {
    return this.recentOperations;
  }

  public measureOperation<T>(
    operation: () => T | Promise<T>,
    operationType: keyof PerformanceMetrics, // This ensures operationType is a valid key
    operationName?: string
  ): T | Promise<T> {
    const startTime = performance.now();
    
    const updateMetricsAndCheckThresholds = (duration: number) => {
      const currentMetrics = this.metrics[this.metrics.length - 1];
      if (currentMetrics) {
        // Ensure that operationType is a valid key for currentMetrics that expects a number
        if (typeof currentMetrics[operationType] === 'number') {
            (currentMetrics[operationType] as number) = duration;
        }
      }

      const thresholdKey = operationType as keyof typeof this.thresholds;
      const threshold = this.thresholds[thresholdKey] as number;
      
      if (threshold && duration > threshold) {
        this.addAlert({
          type: 'latency',
          severity: this.getSeverity(duration, threshold),
          message: `Slow ${operationName || operationType}: ${duration.toFixed(2)}ms`,
          value: duration,
          threshold,
          timestamp: Date.now(),
        });
      }
    };

    const result = operation();

    if (result instanceof Promise) {
      return result.then((value) => {
        const duration = performance.now() - startTime;
        updateMetricsAndCheckThresholds(duration);
        this.recentOperations.push({ name: operationName || String(operationType), duration });
        if (this.recentOperations.length > 10) this.recentOperations.shift(); // Consider making 10 a constant
        return value;
      }).catch((error: unknown) => { // Changed catch error to unknown
        const duration = performance.now() - startTime;
        // Assuming operationType for errors should also be updated, though it's less direct
        // updateMetricsAndCheckThresholds(duration); // Or handle error duration differently
        this.addAlert({
          type: 'error',
          severity: 'high',
          message: `Operation failed: ${operationName || operationType}. ${error instanceof Error ? error.message : String(error)}`,
          value: duration,
          threshold: 0,
          timestamp: Date.now(),
        });
        this.recentOperations.push({ name: `${operationName || String(operationType)} (Error)`, duration });
        if (this.recentOperations.length > 10) this.recentOperations.shift();
        throw error;
      });
    } else {
      const duration = performance.now() - startTime;
      updateMetricsAndCheckThresholds(duration);
      this.recentOperations.push({ name: operationName || String(operationType), duration });
      if (this.recentOperations.length > 10) this.recentOperations.shift();
      return result;
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  public generateReport(): string {
    const latest = this.getLatestMetrics();
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = this.alerts.filter(a => a.severity === 'high').length;

    return `
Performance Report (${new Date().toLocaleString()})
================================================

Current Metrics:
- Memory Usage: ${latest ? (latest.memoryUsage / 1024 / 1024).toFixed(2) : 'N/A'}MB
- Active Timers: ${latest?.activeTimers || 0}
- Active Listeners: ${latest?.activeListeners || 0}
- Render Time: ${latest?.renderTime.toFixed(2) || 'N/A'}ms
- API Response Time: ${latest?.apiResponseTime.toFixed(2) || 'N/A'}ms

Alerts Summary:
- Critical: ${criticalAlerts}
- High: ${highAlerts}
- Total: ${this.alerts.length}

Recent Alerts:
${this.alerts.slice(-5).map(alert => 
  `- [${alert.severity.toUpperCase()}] ${alert.message}`
).join('\n')}
    `.trim();
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.metrics = [];
    this.alerts = [];
  }
}
