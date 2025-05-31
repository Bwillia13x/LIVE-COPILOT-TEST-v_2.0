/**
 * Production Monitoring Service
 * Handles analytics, error reporting, and performance monitoring for production
 */

export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private isProduction: boolean;
  private analyticsId: string | null;
  private errorQueue: Array<any> = [];
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
    // Initialize Google Analytics if available
    if (this.analyticsId) {
      this.initializeAnalytics();
    }

    // Initialize error reporting
    this.initializeErrorReporting();

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    // Initialize user session tracking
    this.initializeSessionTracking();
  }

  private initializeAnalytics(): void {
    if (!this.analyticsId) return;

    // Load Google Analytics
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
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
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private initializePerformanceMonitoring(): void {
    // Web Vitals monitoring
    if ('web-vital' in window) {
      this.monitorWebVitals();
    }

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        this.recordMetric('first_byte', navigation.responseStart - navigation.fetchStart);
      }, 0);
    });
  }

  private initializeSessionTracking(): void {
    // Track session start
    this.trackEvent('session_start', {
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language
    });

    // Track session duration
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
    // This would integrate with web-vitals library in a real implementation
    // For now, we'll use basic performance observations
    
    if ('PerformanceObserver' in window) {
      // Monitor paint timing
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.startTime);
        }
      }).observe({ entryTypes: ['paint'] });

      // Monitor layout shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('cumulative_layout_shift', (entry as any).value);
        }
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Public API methods
  trackEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isProduction) return;

    // Google Analytics tracking
    if (this.analyticsId && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...parameters,
        app_name: 'Voice Notes Pro',
        app_version: '1.0.0'
      });
    }

    // Custom analytics endpoint (if available)
    this.sendToAnalytics('event', {
      name: eventName,
      parameters,
      timestamp: Date.now()
    });
  }

  trackPageView(pageName: string, additionalData?: Record<string, any>): void {
    if (!this.isProduction) return;

    this.trackEvent('page_view', {
      page_name: pageName,
      page_location: window.location.href,
      ...additionalData
    });
  }

  reportError(errorType: string, errorData: Record<string, any>): void {
    if (!this.isProduction) return;

    const errorReport = {
      type: errorType,
      data: errorData,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to queue for batch sending
    this.errorQueue.push(errorReport);

    // Send immediately for critical errors
    if (errorType === 'JavaScript Error' || errorType === 'Unhandled Promise Rejection') {
      this.flushErrorQueue();
    }

    // Track error event
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorData.message || 'Unknown error'
    });
  }

  recordMetric(metricName: string, value: number): void {
    if (!this.isProduction) return;

    this.performanceMetrics.set(metricName, value);

    // Send to analytics
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value
    });
  }

  private sendToAnalytics(type: string, data: any): void {
    // This would send to your custom analytics endpoint
    // For now, we'll just log in development
    if (!this.isProduction) {
      // Removed console.log(`[Analytics] ${type}:`, data);
    }
  }

  private flushErrorQueue(): void {
    if (this.errorQueue.length === 0) return;

    // Send errors to monitoring service
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // In a real implementation, you'd send to your error monitoring service
    // e.g., Sentry, LogRocket, etc.
    if (!this.isProduction) {
      // Removed console.error('[Error Queue]', errors);
    }
  }

  // Feature usage tracking
  trackFeatureUsage(featureName: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature_usage', {
      feature: featureName,
      action: action,
      ...metadata
    });
  }

  // Voice notes specific tracking
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

  // Performance monitoring for app-specific metrics
  trackAppPerformance(operation: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`app_${operation}_duration`, duration);
  }

  // User engagement tracking
  trackUserEngagement(action: string, value?: number): void {
    this.trackEvent('user_engagement', {
      engagement_action: action,
      engagement_value: value || 1
    });
  }
}
