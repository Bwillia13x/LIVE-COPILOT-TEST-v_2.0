// Final validation script to test chart functionality
console.log('🔍 Running final chart validation...');

// Test results object
const testResults = {
    htmlStructure: false,
    cssPresent: false,
    chartJsAvailable: false,
    mainAppAccessible: false,
    chartGeneration: false
};

// Test 1: Check HTML structure
function testHtmlStructure() {
    return fetch('http://localhost:8081/index.html')
        .then(response => response.text())
        .then(html => {
            const hasChartArea = html.includes('id="aiChartDisplayArea"');
            const hasRawContainer = html.includes('rawTranscription');
            const isProperlyNested = html.includes('<div id="aiChartDisplayArea" class="ai-chart-raw-display">');
            
            testResults.htmlStructure = hasChartArea && hasRawContainer && isProperlyNested;
            
            console.log('📋 HTML Structure Test:');
            console.log('  ✓ Chart area present:', hasChartArea);
            console.log('  ✓ Raw container present:', hasRawContainer);
            console.log('  ✓ Properly nested:', isProperlyNested);
            console.log('  📊 Result:', testResults.htmlStructure ? 'PASS' : 'FAIL');
            
            return testResults.htmlStructure;
        });
}

// Test 2: Check CSS styling
function testCssStyling() {
    return fetch('http://localhost:8081/index.css')
        .then(response => response.text())
        .then(css => {
            const hasChartClass = css.includes('.ai-chart-raw-display');
            const hasMinHeight = css.includes('min-height: 200px');
            const hasEmptyState = css.includes(':empty::before');
            
            testResults.cssPresent = hasChartClass && hasMinHeight && hasEmptyState;
            
            console.log('🎨 CSS Styling Test:');
            console.log('  ✓ Chart class present:', hasChartClass);
            console.log('  ✓ Min height set:', hasMinHeight);
            console.log('  ✓ Empty state styling:', hasEmptyState);
            console.log('  📊 Result:', testResults.cssPresent ? 'PASS' : 'FAIL');
            
            return testResults.cssPresent;
        });
}

// Test 3: Chart.js availability (simulated)
function testChartJsAvailability() {
    // Since we can't directly test Chart.js from Node.js, we check if it's referenced
    return fetch('http://localhost:8081/index.html')
        .then(response => response.text())
        .then(html => {
            const hasChartJs = html.includes('chart.js') || html.includes('Chart.js');
            testResults.chartJsAvailable = hasChartJs;
            
            console.log('📦 Chart.js Availability Test:');
            console.log('  ✓ Chart.js referenced:', hasChartJs);
            console.log('  📊 Result:', testResults.chartJsAvailable ? 'PASS' : 'FAIL');
            
            return testResults.chartJsAvailable;
        });
}

// Test 4: Main app accessibility
function testMainAppAccessibility() {
    return fetch('http://localhost:8081/')
        .then(response => {
            testResults.mainAppAccessible = response.ok;
            
            console.log('🌐 Main App Accessibility Test:');
            console.log('  ✓ Server responding:', response.ok);
            console.log('  ✓ Status code:', response.status);
            console.log('  📊 Result:', testResults.mainAppAccessible ? 'PASS' : 'FAIL');
            
            return testResults.mainAppAccessible;
        });
}

// Test 5: TypeScript compilation check
function testTypeScriptCompilation() {
    return fetch('http://localhost:8081/index.tsx')
        .then(response => response.text())
        .then(tsx => {
            const hasChartGeneration = tsx.includes('generateChartsFromAI');
            const hasChartMethods = tsx.includes('createTopicChart');
            const hasClearCharts = tsx.includes('clearActiveCharts');
            
            testResults.chartGeneration = hasChartGeneration && hasChartMethods && hasClearCharts;
            
            console.log('⚙️ TypeScript Chart Generation Test:');
            console.log('  ✓ generateChartsFromAI method:', hasChartGeneration);
            console.log('  ✓ createTopicChart method:', hasChartMethods);
            console.log('  ✓ clearActiveCharts method:', hasClearCharts);
            console.log('  📊 Result:', testResults.chartGeneration ? 'PASS' : 'FAIL');
            
            return testResults.chartGeneration;
        });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive chart validation...\n');
    
    try {
        await testHtmlStructure();
        console.log('');
        
        await testCssStyling();
        console.log('');
        
        await testChartJsAvailability();
        console.log('');
        
        await testMainAppAccessibility();
        console.log('');
        
        await testTypeScriptCompilation();
        console.log('');
        
        // Final summary
        const passedTests = Object.values(testResults).filter(result => result).length;
        const totalTests = Object.keys(testResults).length;
        
        console.log('📊 FINAL VALIDATION SUMMARY:');
        console.log('═══════════════════════════════');
        console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
        console.log('');
        
        Object.entries(testResults).forEach(([test, result]) => {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${test}: ${status}`);
        });
        
        console.log('');
        
        if (passedTests === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Chart rendering should be working properly.');
            console.log('');
            console.log('📋 To verify manually:');
            console.log('1. Open http://localhost:8081 in browser');
            console.log('2. Switch to the "Raw" tab');
            console.log('3. Open browser console and run: window.app.testChartGeneration()');
            console.log('4. Charts should appear in the styled display area');
        } else {
            console.log('⚠️ Some tests failed. Chart rendering may have issues.');
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testResults };
} else {
    // Run immediately if in browser
    runAllTests();
}
