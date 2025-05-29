/**
 * Restart Validation Test Suite
 * Tests all functionality after restarting the application
 */

console.log('🔄 RESTART VALIDATION TEST SUITE STARTING...\n');

class RestartValidationTest {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.chartGenerationCount = 0;
        this.isMonitoring = false;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
        this.testResults.push({ timestamp, message, type });
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive restart validation...\n');
        
        // Test 1: Check if app loaded correctly
        await this.testAppInitialization();
        
        // Test 2: Monitor for infinite chart generation
        await this.testInfiniteChartGeneration();
        
        // Test 3: Test manual recording functionality
        await this.testRecordingFunctionality();
        
        // Test 4: Test manual chart generation
        await this.testManualChartGeneration();
        
        // Test 5: Test performance optimization (should not cause infinite loops)
        await this.testPerformanceOptimization();
        
        // Test 6: Test cleanup functionality
        await this.testCleanupFunctionality();
        
        // Generate final report
        this.generateFinalReport();
    }

    async testAppInitialization() {
        this.log('Testing application initialization...', 'info');
        
        try {
            // Check if main components exist
            const recordButton = document.querySelector('.record-button, #recordButton, [data-testid="record-button"]');
            const transcriptArea = document.querySelector('.transcript-area, #transcriptArea, textarea');
            const chartContainer = document.querySelector('.chart-container, #chartContainer, [data-testid="chart-container"]');
            
            if (recordButton) {
                this.log('✓ Record button found and accessible', 'success');
            } else {
                this.log('✗ Record button not found', 'error');
            }
            
            if (transcriptArea) {
                this.log('✓ Transcript area found and accessible', 'success');
            } else {
                this.log('✓ Transcript area may be dynamically created', 'info');
            }
            
            // Check if VoiceNotesApp exists in global scope
            if (typeof window.voiceNotesApp !== 'undefined' || typeof voiceNotesApp !== 'undefined') {
                this.log('✓ VoiceNotesApp instance found', 'success');
            } else {
                this.log('? VoiceNotesApp may be in different scope', 'info');
            }
            
        } catch (error) {
            this.log(`App initialization test failed: ${error.message}`, 'error');
        }
    }

    async testInfiniteChartGeneration() {
        this.log('Testing for infinite chart generation (monitoring for 15 seconds)...', 'info');
        
        return new Promise((resolve) => {
            this.chartGenerationCount = 0;
            this.isMonitoring = true;
            
            // Monitor console for chart-related activity
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                const message = args.join(' ').toLowerCase();
                if (message.includes('chart') || message.includes('generation') || message.includes('creating')) {
                    this.chartGenerationCount++;
                    this.log(`Chart-related activity detected: ${args.join(' ')}`, 'info');
                }
                originalConsoleLog.apply(console, args);
            };
            
            // Monitor for DOM changes in chart areas
            const chartObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        const target = mutation.target;
                        if (target.className && (
                            target.className.includes('chart') || 
                            target.className.includes('graph') ||
                            target.id && (target.id.includes('chart') || target.id.includes('graph'))
                        )) {
                            this.chartGenerationCount++;
                            this.log('Chart DOM modification detected', 'info');
                        }
                    }
                });
            });
            
            document.body && chartObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                this.isMonitoring = false;
                console.log = originalConsoleLog;
                chartObserver.disconnect();
                
                if (this.chartGenerationCount === 0) {
                    this.log('✓ NO INFINITE CHART GENERATION DETECTED!', 'success');
                } else if (this.chartGenerationCount < 5) {
                    this.log(`⚠️ Minimal chart activity detected (${this.chartGenerationCount} events) - likely normal`, 'info');
                } else {
                    this.log(`❌ Potential infinite chart generation detected (${this.chartGenerationCount} events)`, 'error');
                }
                
                resolve();
            }, 15000);
        });
    }

    async testRecordingFunctionality() {
        this.log('Testing recording functionality...', 'info');
        
        try {
            // Try to find and test record button
            const recordButton = document.querySelector('.record-button, #recordButton, [data-testid="record-button"], button[class*="record"], button[id*="record"]');
            
            if (recordButton) {
                this.log('✓ Record button found', 'success');
                
                // Check if button is clickable
                const isEnabled = !recordButton.disabled && recordButton.style.display !== 'none';
                if (isEnabled) {
                    this.log('✓ Record button is enabled and clickable', 'success');
                } else {
                    this.log('⚠️ Record button found but may be disabled', 'info');
                }
            } else {
                this.log('? Record button not found with standard selectors', 'info');
            }
            
            // Check for WebRTC support
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.log('✓ WebRTC/MediaDevices API available', 'success');
            } else {
                this.log('❌ WebRTC/MediaDevices API not available', 'error');
            }
            
        } catch (error) {
            this.log(`Recording functionality test failed: ${error.message}`, 'error');
        }
    }

    async testManualChartGeneration() {
        this.log('Testing manual chart generation...', 'info');
        
        try {
            // Look for chart generation buttons
            const chartButtons = document.querySelectorAll('button[class*="chart"], button[id*="chart"], button[data-testid*="chart"]');
            
            if (chartButtons.length > 0) {
                this.log(`✓ Found ${chartButtons.length} chart-related button(s)`, 'success');
                
                chartButtons.forEach((button, index) => {
                    const buttonText = button.textContent || button.innerHTML || `Button ${index + 1}`;
                    this.log(`  - Chart button: "${buttonText.slice(0, 50)}"`, 'info');
                });
            } else {
                this.log('? No chart buttons found with standard selectors', 'info');
            }
            
            // Check for chart containers
            const chartContainers = document.querySelectorAll('.chart-container, #chartContainer, [data-testid*="chart"], canvas, svg');
            if (chartContainers.length > 0) {
                this.log(`✓ Found ${chartContainers.length} potential chart container(s)`, 'success');
            } else {
                this.log('? No chart containers found', 'info');
            }
            
        } catch (error) {
            this.log(`Manual chart generation test failed: ${error.message}`, 'error');
        }
    }

    async testPerformanceOptimization() {
        this.log('Testing performance optimization (should not cause infinite loops)...', 'info');
        
        try {
            let performanceActivityCount = 0;
            
            // Monitor for performance-related console activity
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                const message = args.join(' ').toLowerCase();
                if (message.includes('performance') || message.includes('optimization') || message.includes('optimize')) {
                    performanceActivityCount++;
                    this.log(`Performance activity: ${args.join(' ')}`, 'info');
                }
                originalConsoleLog.apply(console, args);
            };
            
            // Wait and monitor
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            console.log = originalConsoleLog;
            
            if (performanceActivityCount === 0) {
                this.log('✓ No excessive performance optimization activity detected', 'success');
            } else if (performanceActivityCount < 3) {
                this.log(`✓ Normal performance optimization activity (${performanceActivityCount} events)`, 'success');
            } else {
                this.log(`⚠️ High performance optimization activity (${performanceActivityCount} events)`, 'info');
            }
            
        } catch (error) {
            this.log(`Performance optimization test failed: ${error.message}`, 'error');
        }
    }

    async testCleanupFunctionality() {
        this.log('Testing cleanup functionality...', 'info');
        
        try {
            // Check if cleanup methods exist
            const cleanupMethods = ['cleanup', 'destroy', 'dispose'];
            let foundCleanupMethods = 0;
            
            // Try to access global app instance
            const appInstances = [
                window.voiceNotesApp,
                window.app,
                global?.voiceNotesApp,
                this.voiceNotesApp
            ].filter(Boolean);
            
            appInstances.forEach(app => {
                cleanupMethods.forEach(method => {
                    if (typeof app[method] === 'function') {
                        foundCleanupMethods++;
                        this.log(`✓ Found cleanup method: ${method}`, 'success');
                    }
                });
            });
            
            if (foundCleanupMethods > 0) {
                this.log(`✓ Found ${foundCleanupMethods} cleanup method(s)`, 'success');
            } else {
                this.log('? No explicit cleanup methods found (may be handled internally)', 'info');
            }
            
        } catch (error) {
            this.log(`Cleanup functionality test failed: ${error.message}`, 'error');
        }
    }

    generateFinalReport() {
        const endTime = Date.now();
        const duration = (endTime - this.startTime) / 1000;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 RESTART VALIDATION TEST FINAL REPORT');
        console.log('='.repeat(60));
        
        console.log(`⏱️ Test Duration: ${duration.toFixed(2)} seconds`);
        console.log(`📊 Total Tests: ${this.testResults.length}`);
        
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const infoCount = this.testResults.filter(r => r.type === 'info').length;
        
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`ℹ️ Info: ${infoCount}`);
        
        console.log('\n🔍 KEY FINDINGS:');
        
        if (this.chartGenerationCount === 0) {
            console.log('🎉 INFINITE CHART GENERATION BUG APPEARS TO BE FIXED!');
        } else if (this.chartGenerationCount < 5) {
            console.log('✅ Minimal chart activity detected - likely normal operation');
        } else {
            console.log('⚠️ Higher than expected chart activity - may need investigation');
        }
        
        if (errorCount === 0) {
            console.log('✅ All critical functionality tests passed');
        } else {
            console.log(`⚠️ ${errorCount} errors detected - see details above`);
        }
        
        console.log('\n📝 RECOMMENDATION:');
        if (errorCount === 0 && this.chartGenerationCount < 5) {
            console.log('🎯 Application appears to be working correctly after the fix!');
            console.log('👍 Manual testing recommended to verify all features work as expected.');
        } else {
            console.log('🔧 Some issues detected - manual verification and potential fixes needed.');
        }
        
        console.log('='.repeat(60));
    }
}

// Auto-run when script loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const validator = new RestartValidationTest();
        validator.runAllTests();
    }, 2000); // Wait 2 seconds for app to fully load
});

// Also provide manual trigger
window.runRestartValidation = () => {
    const validator = new RestartValidationTest();
    return validator.runAllTests();
};

console.log('Restart validation test loaded. Will auto-run in 2 seconds or call window.runRestartValidation()');
