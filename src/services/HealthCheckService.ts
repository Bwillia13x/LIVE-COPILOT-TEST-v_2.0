/**
 * Production Health Check Service
 * Monitors application health and provides diagnostic information
 */

import { APP_CONFIG, IS_PRODUCTION, getEnvironmentInfo } from '../config/environment.js';

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
    const startTime = performance.now();
    const checks: HealthCheckResult['checks'] = {};

    // Browser compatibility check
    checks.browserCompatibility = await this.checkBrowserCompatibility();

    // API connectivity check
    checks.apiConnectivity = await this.checkApiConnectivity();

    // Local storage check
    checks.localStorage = this.checkLocalStorage();

    // WebAudio API check
    checks.webAudio = this.checkWebAudio();

    // Service worker check (if applicable)
    if (IS_PRODUCTION) {
      checks.serviceWorker = this.checkServiceWorker();
    }

    // Performance check
    checks.performance = this.checkPerformance();

    // Memory usage check
    checks.memory = this.checkMemoryUsage();

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
    const warningChecks = Object.values(checks).filter(check => check.status === 'warn').length;

    let status: HealthCheckResult['status'] = 'healthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warningChecks > 0) {
      status = 'warning';
    }

    const duration = performance.now() - startTime;

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

  private async checkBrowserCompatibility(): Promise<HealthCheckResult['checks'][string]> {
    const start = performance.now();
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

    const duration = performance.now() - start;

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

  private async checkApiConnectivity(): Promise<HealthCheckResult['checks'][string]> {
    const start = performance.now();

    try {
      // Simple connectivity test - just check if we can make a basic request
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });

      const duration = performance.now() - start;

      return {
        status: 'pass',
        message: 'Network connectivity available',
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        status: 'warn',
        message: `Network connectivity issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkLocalStorage(): HealthCheckResult['checks'][string] {
    const start = performance.now();

    try {
      const testKey = '__health_check_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const duration = performance.now() - start;

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
      const duration = performance.now() - start;
      return {
        status: 'fail',
        message: `localStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkWebAudio(): HealthCheckResult['checks'][string] {
    const start = performance.now();

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        return {
          status: 'fail',
          message: 'WebAudio API not available',
          duration: performance.now() - start
        };
      }

      // Test creating an audio context
      const context = new AudioContext();
      context.close();

      const duration = performance.now() - start;

      return {
        status: 'pass',
        message: 'WebAudio API available',
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        status: 'warn',
        message: `WebAudio API issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkServiceWorker(): HealthCheckResult['checks'][string] {
    const start = performance.now();

    if (!('serviceWorker' in navigator)) {
      return {
        status: 'warn',
        message: 'Service Worker not supported',
        duration: performance.now() - start
      };
    }

    // Check if service worker is registered and active
    const registration = navigator.serviceWorker.controller;
    const duration = performance.now() - start;

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

  private checkPerformance(): HealthCheckResult['checks'][string] {
    const start = performance.now();

    try {
      // Check if performance API is available
      if (!performance || !performance.now) {
        return {
          status: 'warn',
          message: 'Performance API not available',
          duration: 0
        };
      }

      // Check memory usage if available
      const memory = (performance as any).memory;
      if (memory) {
        const usedMemory = memory.usedJSHeapSize / 1024 / 1024; // MB
        const totalMemory = memory.totalJSHeapSize / 1024 / 1024; // MB
        
        if (usedMemory > 100) { // More than 100MB
          return {
            status: 'warn',
            message: `High memory usage: ${usedMemory.toFixed(2)}MB`,
            duration: performance.now() - start
          };
        }
      }

      const duration = performance.now() - start;

      return {
        status: 'pass',
        message: 'Performance metrics normal',
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        status: 'warn',
        message: `Performance check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration
      };
    }
  }

  private checkMemoryUsage(): HealthCheckResult['checks'][string] {
    const start = performance.now();

    try {
      const memory = (performance as any).memory;
      
      if (!memory) {
        return {
          status: 'warn',
          message: 'Memory usage information not available',
          duration: performance.now() - start
        };
      }

      const used = memory.usedJSHeapSize / 1024 / 1024; // MB
      const total = memory.totalJSHeapSize / 1024 / 1024; // MB
      const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB

      const usage = (used / limit) * 100;
      const duration = performance.now() - start;

      if (usage > 80) {
        return {
          status: 'warn',
          message: `High memory usage: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
          duration
        };
      } else if (usage > 95) {
        return {
          status: 'fail',
          message: `Critical memory usage: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
          duration
        };
      }

      return {
        status: 'pass',
        message: `Memory usage normal: ${usage.toFixed(1)}% (${used.toFixed(2)}MB)`,
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
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
