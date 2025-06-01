/**
 * Production Monitoring Service
 * Handles analytics, error reporting, and performance monitoring for production
 */

import { ErrorReport, LayoutShiftEntry } from '../types/index.js'; // Moved LayoutShiftEntry import here

export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private isProduction: boolean;
  private analyticsId: string | null;
  private errorQueue: Array<ErrorReport> = [];
  private performanceMetrics: Map<string, number> = new Map();

  private constructor() {
    this.isProduction = import.meta.env.VITE_APP_ENV === 'production';
    this.analyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID || null;
    
    if (this.isProduction) {
      this.initializeMonitoring();
    }
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  private initializeMonitoring(): void {
    if (this.analyticsId) {
      this.initializeAnalytics();
    }
    this.initializeErrorReporting();
    this.initializePerformanceMonitoring();
    this.initializeSessionTracking();
  }

  private initializeAnalytics(): void {
    if (!this.analyticsId) return;

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsId}`;
    script.async = true;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', this.analyticsId, {
      page_title: 'Voice Notes Pro',
      page_location: window.location.href,
      custom_map: {
        'custom_parameter_1': 'voice_notes_session'
      }
    });
  }

  private initializeErrorReporting(): void {
    window.addEventListener('error', (event) => {
      this.reportError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportError('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private initializePerformanceMonitoring(): void {
    if ('web-vital' in window) { // This check might be too simple for full web-vitals integration
      this.monitorWebVitals();
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
            this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
            this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
            this.recordMetric('first_byte', navigation.responseStart - navigation.fetchStart);
        }
      }, 0);
    });
  }

  private initializeSessionTracking(): void {
    this.trackEvent('session_start', {
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language
    });

    const sessionStart = Date.now();
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - sessionStart;
      this.trackEvent('session_end', {
        duration: sessionDuration,
        timestamp: Date.now()
      });
    });
  }

  private monitorWebVitals(): void {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.startTime);
        }
      }).observe({ entryTypes: ['paint'] });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('cumulative_layout_shift', (entry as LayoutShiftEntry).value);
        }
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
    if (!this.isProduction) return;
    if (this.analyticsId && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...parameters,
        app_name: 'Voice Notes Pro', // Consider making these constants
        app_version: '1.0.0'     // Consider making these constants
      });
    }
    this.sendToAnalytics('event', {
      name: eventName,
      parameters,
      timestamp: Date.now()
    });
  }

  trackPageView(pageName: string, additionalData?: Record<string, unknown>): void {
    if (!this.isProduction) return;
    this.trackEvent('page_view', {
      page_name: pageName,
      page_location: window.location.href,
      ...additionalData
    });
  }

  reportError(errorType: string, errorData: Record<string, unknown>): void {
    if (!this.isProduction) return;
    const errorReport: ErrorReport = {
      type: errorType,
      data: errorData,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    this.errorQueue.push(errorReport);
    if (errorType === 'JavaScript Error' || errorType === 'Unhandled Promise Rejection') {
      this.flushErrorQueue();
    }
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: (errorData as {message?: unknown}).message || 'Unknown error'
    });
  }

  recordMetric(metricName: string, value: number): void {
    if (!this.isProduction) return;
    this.performanceMetrics.set(metricName, value);
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value
    });
  }

  private sendToAnalytics(type: string, data: unknown): void {
    if (!this.isProduction) {
      console.log(`[Analytics] ${type}:`, data);
    }
  }

  private flushErrorQueue(): void {
    if (this.errorQueue.length === 0) return;
    const errors = [...this.errorQueue];
    this.errorQueue = [];
    if (!this.isProduction) {
      console.error('[Error Queue]', errors);
    }
  }

  trackFeatureUsage(featureName: string, action: string, metadata?: Record<string, unknown>): void {
    this.trackEvent('feature_usage', {
      feature: featureName,
      action: action,
      ...metadata
    });
  }

  trackTranscriptionEvent(eventType: 'start' | 'stop' | 'error', duration?: number): void {
    this.trackEvent('transcription_event', {
      event_type: eventType,
      duration: duration || 0
    });
  }

  trackAIFeatureUsage(feature: 'polish' | 'chart' | 'summary', success: boolean): void {
    this.trackEvent('ai_feature_usage', {
      ai_feature: feature,
      success: success
    });
  }

  trackAppPerformance(operation: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`app_${operation}_duration`, duration);
  }

  trackUserEngagement(action: string, value?: number): void {
    this.trackEvent('user_engagement', {
      engagement_action: action,
      engagement_value: value || 1
    });
  }
}
