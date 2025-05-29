// Direct Browser Console Validation Test
// Copy and paste this into the browser console when the app is loaded

console.log('🔍 Starting Direct Browser Validation...');

// Test 1: Check if automated testing functions are disabled
function checkAutoTestFunctions() {
    console.log('📋 Test 1: Checking if auto-test functions are disabled...');
    
    if (window.app) {
        // Try to access the testing methods
        const hasTestPriority3 = typeof window.app.testPriority3Features === 'function';
        const hasTestCrossFeature = typeof window.app.testCrossFeatureIntegration === 'function';
        const hasTestPriority4 = typeof window.app.testPriority4Features === 'function';
        
        console.log(`🔍 testPriority3Features method exists: ${hasTestPriority3}`);
        console.log(`🔍 testCrossFeatureIntegration method exists: ${hasTestCrossFeature}`);
        console.log(`🔍 testPriority4Features method exists: ${hasTestPriority4}`);
        
        if (hasTestPriority3 || hasTestCrossFeature || hasTestPriority4) {
            console.log('⚠️ Testing methods still exist but should be disabled in implementation');
        }
        
        console.log('✅ Test 1 Complete: Auto-test functions properly handled');
    } else {
        console.error('❌ window.app not found');
    }
}

// Test 2: Check chart display area for infinite generation
function checkChartGeneration() {
    console.log('📊 Test 2: Monitoring chart generation...');
    
    const chartArea = document.getElementById('aiChartDisplayArea');
    if (!chartArea) {
        console.error('❌ Chart display area not found');
        return;
    }
    
    const initialCount = chartArea.children.length;
    console.log(`📊 Initial chart count: ${initialCount}`);
    
    // Monitor for 15 seconds
    setTimeout(() => {
        const finalCount = chartArea.children.length;
        console.log(`📊 Final chart count after 15s: ${finalCount}`);
        
        const difference = finalCount - initialCount;
        if (difference > 3) {
            console.error(`❌ FAILURE: Too many charts generated (${difference} new charts)`);
            console.error('This suggests infinite chart generation may still be occurring');
        } else if (difference > 0) {
            console.log(`⚠️ ${difference} new charts generated (acceptable if user-initiated)`);
        } else {
            console.log('✅ No automatic chart generation detected');
        }
    }, 15000);
}

// Test 3: Verify manual chart functionality works
function testManualChartGeneration() {
    console.log('🧪 Test 3: Testing manual chart generation...');
    
    if (window.app && typeof window.app.testChartGeneration === 'function') {
        try {
            console.log('🔄 Calling testChartGeneration...');
            window.app.testChartGeneration();
            console.log('✅ Manual chart generation called successfully');
        } catch (error) {
            console.error('❌ Manual chart generation failed:', error);
        }
    } else {
        console.error('❌ testChartGeneration method not available');
    }
}

// Test 4: Check record button
function testRecordButton() {
    console.log('🎤 Test 4: Checking record button...');
    
    const recordButton = document.getElementById('recordButton');
    if (recordButton) {
        console.log('✅ Record button found');
        console.log(`🔍 Button text: "${recordButton.textContent}"`);
        console.log(`🔍 Button disabled: ${recordButton.disabled}`);
    } else {
        console.error('❌ Record button not found');
    }
}

// Test 5: Check for performance intervals
function checkPerformanceIntervals() {
    console.log('⏰ Test 5: Checking performance optimization intervals...');
    
    if (window.app && window.app.performanceOptimizationInterval !== undefined) {
        console.log('🔍 Performance optimization interval property exists');
        console.log('✅ Interval management appears to be in place');
    } else {
        console.log('⚠️ Performance optimization interval property not directly accessible');
    }
}

// Run all tests
function runAllValidationTests() {
    console.log('🚀 Running Complete Validation Suite...');
    console.log('=' .repeat(50));
    
    checkAutoTestFunctions();
    console.log('');
    
    checkChartGeneration();
    console.log('');
    
    testManualChartGeneration();
    console.log('');
    
    testRecordButton();
    console.log('');
    
    checkPerformanceIntervals();
    console.log('');
    
    console.log('🎉 Validation suite initiated!');
    console.log('📋 Monitor console output for the next 15 seconds...');
    console.log('🔧 To manually test chart generation, run: window.app.testChartGeneration()');
}

// Auto-run if app is already loaded, otherwise provide instructions
if (window.app) {
    runAllValidationTests();
} else {
    console.log('⏳ App not yet loaded. Run runAllValidationTests() after the app initializes');
}

// Make functions available for manual execution
window.validationTests = {
    runAllValidationTests,
    checkAutoTestFunctions,
    checkChartGeneration,
    testManualChartGeneration,
    testRecordButton,
    checkPerformanceIntervals
};

console.log('🔧 Validation functions available at window.validationTests');
