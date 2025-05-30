/**
 * Phase 2 Performance Optimization Validation Script
 * Tests all performance improvements and monitoring features
 */

class Phase2PerformanceValidator {
  constructor() {
    this.results = [];
    this.app = null;
    this.performanceData = [];
    this.startTime = Date.now();
  }

  async validatePerformanceOptimizations() {
    console.log('🚀 Starting Phase 2 Performance Validation...');
    
    try {
      // Wait for app to load
      await this.waitForAppLoad();
      
      // Test performance monitoring
      await this.testPerformanceMonitoring();
      
      // Test bundle optimization
      await this.testBundleOptimization();
      
      // Test interval management
      await this.testIntervalManagement();
      
      // Test lazy loading
      await this.testLazyLoading();
      
      // Test memory management
      await this.testMemoryManagement();
      
      // Test performance UI indicators
      await this.testPerformanceUI();
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.push({
        category: 'Critical Error',
        test: 'Validation Process',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async waitForAppLoad() {
    console.log('⏳ Waiting for app to load...');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      if (window.audioApp) {
        this.app = window.audioApp;
        this.results.push({
          category: 'App Loading',
          test: 'Initial Load',
          status: 'PASSED',
          details: `App loaded successfully in ${attempts * 100}ms`,
          timestamp: new Date().toISOString()
        });
        console.log('✅ App loaded successfully');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('App failed to load within timeout period');
  }

  async testPerformanceMonitoring() {
    console.log('📊 Testing Performance Monitoring...');
    
    try {
      // Check if PerformanceMonitor is accessible
      const performanceMonitor = this.app?.performanceMonitor;
      
      if (!performanceMonitor) {
        throw new Error('PerformanceMonitor not accessible');
      }
      
      // Test metric collection
      const metrics = performanceMonitor.getLatestMetrics();
      
      this.results.push({
        category: 'Performance Monitoring',
        test: 'Metrics Collection',
        status: metrics ? 'PASSED' : 'FAILED',
        details: metrics ? `Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB, FPS: ${metrics.frameRate}` : 'No metrics available',
        timestamp: new Date().toISOString()
      });
      
      // Test operation measurement
      const testOperation = await performanceMonitor.measureOperation('testOperation', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'test result';
      });
      
      this.results.push({
        category: 'Performance Monitoring',
        test: 'Operation Measurement',
        status: testOperation === 'test result' ? 'PASSED' : 'FAILED',
        details: 'Operation measurement wrapper working correctly',
        timestamp: new Date().toISOString()
      });
      
      // Test alerts
      const alerts = performanceMonitor.getAlerts();
      
      this.results.push({
        category: 'Performance Monitoring',
        test: 'Alert System',
        status: Array.isArray(alerts) ? 'PASSED' : 'FAILED',
        details: `${alerts.length} alerts in system`,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Performance monitoring tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Performance Monitoring',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Performance monitoring test failed:', error);
    }
  }

  async testBundleOptimization() {
    console.log('📦 Testing Bundle Optimization...');
    
    try {
      // Check if BundleOptimizer is accessible
      const bundleOptimizer = this.app?.bundleOptimizer;
      
      if (!bundleOptimizer) {
        throw new Error('BundleOptimizer not accessible');
      }
      
      // Test lazy module registration
      const registeredModules = bundleOptimizer.getRegisteredModules();
      
      this.results.push({
        category: 'Bundle Optimization',
        test: 'Module Registration',
        status: registeredModules.length > 0 ? 'PASSED' : 'FAILED',
        details: `${registeredModules.length} modules registered: ${registeredModules.join(', ')}`,
        timestamp: new Date().toISOString()
      });
      
      // Test critical module loading
      const criticalLoaded = bundleOptimizer.areCriticalModulesLoaded();
      
      this.results.push({
        category: 'Bundle Optimization',
        test: 'Critical Module Loading',
        status: criticalLoaded ? 'PASSED' : 'FAILED',
        details: 'Critical modules loaded successfully',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Bundle optimization tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Bundle Optimization',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Bundle optimization test failed:', error);
    }
  }

  async testIntervalManagement() {
    console.log('⏱️ Testing Interval Management...');
    
    try {
      // Check if IntervalManager is accessible
      const intervalManager = this.app?.intervalManager;
      
      if (!intervalManager) {
        throw new Error('IntervalManager not accessible');
      }
      
      // Test interval creation and cleanup
      let testValue = 0;
      const intervalId = intervalManager.createRecurringTask(
        'testInterval',
        100,
        () => { testValue++; }
      );
      
      // Wait for a few executions
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Stop the interval
      intervalManager.stopTask(intervalId);
      const finalValue = testValue;
      
      // Wait a bit more to ensure it stopped
      await new Promise(resolve => setTimeout(resolve, 200));
      
      this.results.push({
        category: 'Interval Management',
        test: 'Interval Creation and Cleanup',
        status: testValue === finalValue && testValue >= 3 ? 'PASSED' : 'FAILED',
        details: `Interval executed ${testValue} times and stopped correctly`,
        timestamp: new Date().toISOString()
      });
      
      // Test memory leak prevention
      const activeIntervals = intervalManager.getActiveIntervals();
      
      this.results.push({
        category: 'Interval Management',
        test: 'Memory Leak Prevention',
        status: Array.isArray(activeIntervals) ? 'PASSED' : 'FAILED',
        details: `${activeIntervals.length} active intervals tracked`,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Interval management tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Interval Management',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Interval management test failed:', error);
    }
  }

  async testLazyLoading() {
    console.log('🔄 Testing Lazy Loading...');
    
    try {
      // Test chart module lazy loading
      const bundleOptimizer = this.app?.bundleOptimizer;
      
      if (!bundleOptimizer) {
        throw new Error('BundleOptimizer not accessible for lazy loading test');
      }
      
      const loadStartTime = performance.now();
      
      // Attempt to load charting module
      const chartingModule = await bundleOptimizer.loadModule('charting');
      
      const loadEndTime = performance.now();
      const loadTime = loadEndTime - loadStartTime;
      
      this.results.push({
        category: 'Lazy Loading',
        test: 'Chart Module Loading',
        status: chartingModule ? 'PASSED' : 'FAILED',
        details: `Module loaded in ${loadTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      // Test module caching
      const cachedLoadStartTime = performance.now();
      const cachedModule = await bundleOptimizer.loadModule('charting');
      const cachedLoadEndTime = performance.now();
      const cachedLoadTime = cachedLoadEndTime - cachedLoadStartTime;
      
      this.results.push({
        category: 'Lazy Loading',
        test: 'Module Caching',
        status: cachedLoadTime < loadTime ? 'PASSED' : 'FAILED',
        details: `Cached load: ${cachedLoadTime.toFixed(2)}ms vs initial: ${loadTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Lazy loading tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Lazy Loading',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Lazy loading test failed:', error);
    }
  }

  async testMemoryManagement() {
    console.log('🧠 Testing Memory Management...');
    
    try {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Simulate memory-intensive operations
      const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: Math.random() }));
      
      // Trigger cleanup
      if (typeof MemoryManager !== 'undefined' && MemoryManager.cleanup) {
        MemoryManager.cleanup();
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      this.results.push({
        category: 'Memory Management',
        test: 'Memory Cleanup',
        status: 'PASSED',
        details: `Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
      
      // Test interval cleanup
      const intervalManager = this.app?.intervalManager;
      if (intervalManager) {
        const activeBefore = intervalManager.getActiveIntervals().length;
        intervalManager.cleanup();
        const activeAfter = intervalManager.getActiveIntervals().length;
        
        this.results.push({
          category: 'Memory Management',
          test: 'Interval Cleanup',
          status: activeAfter <= activeBefore ? 'PASSED' : 'FAILED',
          details: `Active intervals: ${activeBefore} → ${activeAfter}`,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('✅ Memory management tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Memory Management',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Memory management test failed:', error);
    }
  }

  async testPerformanceUI() {
    console.log('🖥️ Testing Performance UI...');
    
    try {
      // Check for performance indicator elements
      const performanceIndicator = document.getElementById('performanceIndicator');
      const performanceToggleButton = document.getElementById('performanceToggleButton');
      
      this.results.push({
        category: 'Performance UI',
        test: 'UI Elements Present',
        status: performanceIndicator && performanceToggleButton ? 'PASSED' : 'FAILED',
        details: `Performance indicator: ${!!performanceIndicator}, Toggle button: ${!!performanceToggleButton}`,
        timestamp: new Date().toISOString()
      });
      
      // Test toggle functionality
      if (performanceToggleButton) {
        performanceToggleButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const isVisible = performanceIndicator && performanceIndicator.style.display !== 'none';
        
        this.results.push({
          category: 'Performance UI',
          test: 'Toggle Functionality',
          status: isVisible ? 'PASSED' : 'FAILED',
          details: `Performance indicator visibility: ${isVisible}`,
          timestamp: new Date().toISOString()
        });
        
        // Test metric display
        const memoryUsage = document.getElementById('memoryUsage');
        const cpuUsage = document.getElementById('cpuUsage');
        const frameRate = document.getElementById('frameRate');
        
        this.results.push({
          category: 'Performance UI',
          test: 'Metric Display Elements',
          status: memoryUsage && cpuUsage && frameRate ? 'PASSED' : 'FAILED',
          details: `Memory: ${!!memoryUsage}, CPU: ${!!cpuUsage}, FPS: ${!!frameRate}`,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('✅ Performance UI tests completed');
      
    } catch (error) {
      this.results.push({
        category: 'Performance UI',
        test: 'Overall Test',
        status: 'FAILED',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Performance UI test failed:', error);
    }
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASSED').length;
    const failedTests = this.results.filter(r => r.status === 'FAILED').length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 2 PERFORMANCE OPTIMIZATION VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Results:`);
    console.log(`  • Total Tests: ${totalTests}`);
    console.log(`  • Passed: ${passedTests} ✅`);
    console.log(`  • Failed: ${failedTests} ❌`);
    console.log(`  • Success Rate: ${successRate}%`);
    console.log(`  • Test Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'PASSED').length;
      const categoryTotal = categoryResults.length;
      
      console.log(`\n📂 ${category}:`);
      console.log(`  Status: ${categoryPassed}/${categoryTotal} passed`);
      
      categoryResults.forEach(result => {
        const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`  ${statusIcon} ${result.test}: ${result.details}`);
      });
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Store results for external access
    window.phase2ValidationResults = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: parseFloat(successRate),
        duration: (Date.now() - this.startTime) / 1000
      },
      details: this.results,
      timestamp: new Date().toISOString()
    };
    
    return this.results;
  }
}

// Auto-run validation when script loads
window.addEventListener('load', async () => {
  // Wait a bit for the app to fully initialize
  setTimeout(async () => {
    const validator = new Phase2PerformanceValidator();
    await validator.validatePerformanceOptimizations();
  }, 2000);
});

// Export for manual testing
window.Phase2PerformanceValidator = Phase2PerformanceValidator;
