/**
 * Production Health Check Service
 * Monitors application health and provides diagnostic information
 */

import { APP_CONFIG, IS_PRODUCTION, getEnvironmentInfo } from '../config/environment';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'unhealthy';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'warn' | 'fail';
      message: string;
      duration?: number;
    };
  };
  metadata: {
    version: string;
    environment: string;
    uptime: number;
  };
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const perf = typeof performance !== 'undefined' ? performance : null;
    const startTime = perf ? perf.now() : 0;
    const checks: HealthCheckResult['checks'] = {};

    // Browser compatibility check
    checks.browserCompatibility = await this.checkBrowserCompatibility(perf);

    // API connectivity check
    checks.apiConnectivity = await this.checkApiConnectivity(perf);

    // Local storage check
    checks.localStorage = this.checkLocalStorage(perf);

    // WebAudio API check
    checks.webAudio = this.checkWebAudio(perf);

    // Service worker check (if applicable)
    if (IS_PRODUCTION) {
      checks.serviceWorker = this.checkServiceWorker(perf);
    }

    // Performance check
    checks.performance = this.checkPerformance(perf);

    // Memory usage check
    checks.memory = this.checkMemoryUsage(perf);

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
    const warningChecks = Object.values(checks).filter(check => check.status === 'warn').length;

    let status: HealthCheckResult['status'] = 'healthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warningChecks > 0) {
      status = 'warning';
    }

    const duration = perf ? perf.now() - startTime : 0; // This was already correct

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        version: APP_CONFIG.version,
        environment: IS_PRODUCTION ? 'production' : 'development',
        uptime: Date.now() - this.startTime
      }
    };
  }

  private async checkBrowserCompatibility(perf: Performance | null): Promise<HealthCheckResult['checks'][string]> {
    const start = perf ? perf.now() : 0;
    const required = [
      'fetch',
      'Promise',
      'localStorage',
      'WebSocket',
      'AudioContext',
      'MediaRecorder'
    ];

    const missing = required.filter(feature => {
      switch (feature) {
        case 'fetch':
          return !window.fetch;
        case 'Promise':
          return !window.Promise;
        case 'localStorage':
          return !window.localStorage;
        case 'WebSocket':
          return !window.WebSocket;
        case 'AudioContext':
          return !window.AudioContext && !(window as any).webkitAudioContext;
        case 'MediaRecorder':
          return !window.MediaRecorder;
        default:
          return false;
      }
    });

    const duration = perf ? perf.now() - start : 0;

    if (missing.length > 0) {
      return {
        status: 'fail',
        message: `Missing browser features: ${missing.join(', ')}`,
        duration
      };
    }

    return {
      status: 'pass',
      message: 'All required browser features available',
      duration
    };
  }

  private async checkApiConnectivity(perf: Performance | null): Promise<HealthCheckResult['checks'][string]> {
    const start = perf ? perf.now() : 0;

    try {
      // Simple connectivity test - just check if we can make a basic request
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });

      const duration = perf ? perf.now() - start : 0;

      return {
        status: 'pass',
        message: 'Network connectivity available',
        duration
      };
    } catch (error) {
      const duration = perf ? perf.now() - start : 0;
      return {
        status: 'warn',
        message: `Network connectivity issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkLocalStorage(perf: Performance | null): HealthCheckResult['checks'][string] {
    const start = perf ? perf.now() : 0;

    try {
      const testKey = '__health_check_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const duration = perf ? perf.now() - start : 0;

      if (retrieved !== testValue) {
        return {
          status: 'fail',
          message: 'localStorage read/write failed',
          duration
        };
      }

      return {
        status: 'pass',
        message: 'localStorage functioning correctly',
        duration
      };
    } catch (error) {
      const duration = perf ? perf.now() - start : 0;
      return {
        status: 'fail',
        message: `localStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkWebAudio(perf: Performance | null): HealthCheckResult['checks'][string] {
    const start = perf ? perf.now() : 0;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        return {
          status: 'fail',
          message: 'WebAudio API not available',
          duration: perf ? perf.now() - start : 0
        };
      }

      // Test creating an audio context
      const context = new AudioContext();
      context.close();

      const duration = perf ? perf.now() - start : 0;

      return {
        status: 'pass',
        message: 'WebAudio API available',
        duration
      };
    } catch (error) {
      const duration = perf ? perf.now() - start : 0;
      return {
        status: 'warn',
        message: `WebAudio API issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkServiceWorker(perf: Performance | null): HealthCheckResult['checks'][string] {
    const start = perf ? perf.now() : 0;

    if (!navigator || !('serviceWorker' in navigator) || !navigator.serviceWorker) { // Added null check for navigator.serviceWorker
      return {
        status: 'warn',
        message: 'Service Worker not supported',
        duration: perf ? perf.now() - start : 0
      };
    }

    // Check if service worker is registered and active
    const registration = navigator.serviceWorker.controller;
    const duration = perf ? perf.now() - start : 0;

    if (!registration) {
      return {
        status: 'warn',
        message: 'No active service worker',
        duration
      };
    }

    return {
      status: 'pass',
      message: 'Service worker active',
      duration
    };
  }

  private checkPerformance(perf: Performance | null): HealthCheckResult['checks'][string] {
    const start = perf ? perf.now() : 0;

    try {
      // Check if performance API is available
      if (!perf || !perf.now) { // Use passed perf
        return {
          status: 'warn',
          message: 'Performance API not available',
          duration: 0 // Cannot calculate duration if perf.now is not available
        };
      }

      // Check memory usage if available
      const memory = (perf as any).memory; // Use passed perf
      if (memory) {
        const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
        // totalMemory is not used in this check's logic, can be removed if not needed elsewhere
        // const totalMemory = memory.totalJSHeapSize / 1024 / 1024;
        
        if (usedMemory > 100) { // More than 100MB
          return {
            status: 'warn',
            message: `High memory usage: ${usedMemory.toFixed(2)}MB`,
            duration: perf.now() - start
          };
        }
      }

      const duration = perf.now() - start;

      return {
        status: 'pass',
        message: 'Performance metrics normal',
        duration
      };
    } catch (error) {
      const duration = perf ? perf.now() - start : 0;
      return {
        status: 'warn',
        message: `Performance check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkMemoryUsage(perf: Performance | null): HealthCheckResult['checks'][string] {
    const start = perf ? perf.now() : 0;

    try {
      const memory = (perf as any)?.memory; // Use passed perf, and optional chaining for memory
      
      if (!memory) {
        return {
          status: 'warn',
          message: 'Memory usage information not available',
          duration: perf ? perf.now() - start : 0
        };
      }

      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      // total is not used in logic, can remove
      // const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB

      const usage = (used / limit) * 100;
      const duration = perf ? perf.now() - start : 0;

      if (usage > 95) { // Check for critical first
        return {
          status: 'fail',
          message: `Critical memory usage: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
          duration
        };
      } else if (usage > 80) { // Then check for warning
        return {
          status: 'warn',
          message: `High memory usage: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
          duration
        };
      }

      return {
        status: 'pass',
        message: `Memory usage normal: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
        duration
      };
    } catch (error) {
      const duration = perf ? perf.now() - start : 0; // Use guarded perf here
      return {
        status: 'warn',
        message: `Memory check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  // Public endpoint for health checks
  async getHealthStatus(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  // Simple health check for monitoring systems
  async isHealthy(): Promise<boolean> {
    const result = await this.performHealthCheck();
    return result.status === 'healthy';
  }
}
