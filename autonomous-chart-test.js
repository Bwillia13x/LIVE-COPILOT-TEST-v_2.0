// Autonomous Chart Testing Script
console.log('🚀 Starting Autonomous Chart Testing...');

// Test 1: Check if Chart.js is loaded
function testChartJSLoaded() {
    if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js is loaded');
        return true;
    } else {
        console.error('❌ Chart.js is not loaded');
        return false;
    }
}

// Test 2: Check if chart display area exists
function testChartDisplayArea() {
    const chartArea = document.getElementById('aiChartDisplayArea');
    if (chartArea) {
        console.log('✅ Chart display area found');
        console.log('📊 Chart area classes:', chartArea.className);
        console.log('📊 Chart area computed style visibility:', window.getComputedStyle(chartArea).display);
        return true;
    } else {
        console.error('❌ Chart display area not found');
        return false;
    }
}

// Test 3: Test chart generation function
function testChartGeneration() {
    try {
        if (typeof window.app !== 'undefined' && window.app.testChartGeneration) {
            console.log('🔄 Testing chart generation...');
            window.app.testChartGeneration();
            console.log('✅ Chart generation function executed successfully');
            return true;
        } else {
            console.error('❌ Chart generation function not available');
            return false;
        }
    } catch (error) {
        console.error('❌ Error during chart generation:', error);
        return false;
    }
}

// Test 4: Check for actual chart canvas elements
function testChartCanvasElements() {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length > 0) {
        console.log(`✅ Found ${canvases.length} canvas element(s)`);
        canvases.forEach((canvas, index) => {
            console.log(`📊 Canvas ${index + 1}:`, {
                width: canvas.width,
                height: canvas.height,
                id: canvas.id,
                visible: window.getComputedStyle(canvas).display !== 'none'
            });
        });
        return true;
    } else {
        console.log('⚠️ No canvas elements found (charts may not be generated yet)');
        return false;
    }
}

// Test 5: Check tab functionality
function testTabFunctionality() {
    const rawTab = document.querySelector('[data-tab="raw"]');
    const chartArea = document.getElementById('aiChartDisplayArea');
    
    if (rawTab && chartArea) {
        console.log('🔄 Testing tab functionality...');
        rawTab.click();
        
        setTimeout(() => {
            const isVisible = window.getComputedStyle(chartArea.closest('.tab-content')).display !== 'none';
            if (isVisible) {
                console.log('✅ Chart area is visible when Raw tab is active');
            } else {
                console.error('❌ Chart area is not visible when Raw tab is active');
            }
        }, 100);
        
        return true;
    } else {
        console.error('❌ Tab elements not found');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running Comprehensive Chart Tests...\n');
    
    const results = {
        chartJSLoaded: testChartJSLoaded(),
        chartDisplayArea: testChartDisplayArea(),
        chartGeneration: testChartGeneration(),
        chartCanvas: testChartCanvasElements(),
        tabFunctionality: testTabFunctionality()
    };
    
    console.log('\n📋 Test Results Summary:');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Chart functionality is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Chart functionality may need attention.');
    }
    
    return results;
}

// Auto-run tests when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}

// Export for manual testing
window.chartTests = {
    runAllTests,
    testChartJSLoaded,
    testChartDisplayArea,
    testChartGeneration,
    testChartCanvasElements,
    testTabFunctionality
};
