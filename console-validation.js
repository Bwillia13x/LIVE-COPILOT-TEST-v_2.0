// Quick console test script for Voice Notes Pro v2.0 fixes
// Run this in the browser console at http://localhost:5178/

console.log('🧪 Starting Voice Notes Pro v2.0 Fix Validation...');

// Test 1: Check if theme toggle button exists and works
function testThemeToggle() {
    console.log('🎨 Testing theme toggle functionality...');
    
    const themeButton = document.getElementById('themeToggleButton');
    if (!themeButton) {
        console.error('❌ Theme toggle button not found');
        return false;
    }
    
    console.log('✅ Theme toggle button found');
    
    // Get current theme state
    const initialTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    console.log(`Initial theme: ${initialTheme}`);
    
    // Click the button
    themeButton.click();
    
    // Check if theme changed
    setTimeout(() => {
        const newTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        console.log(`Theme after toggle: ${newTheme}`);
        
        if (newTheme !== initialTheme) {
            console.log('✅ Theme toggle is working correctly!');
        } else {
            console.error('❌ Theme did not change after button click');
        }
    }, 500);
    
    return true;
}

// Test 2: Check if chart buttons exist and work
function testChartButtons() {
    console.log('📊 Testing chart generation functionality...');
    
    const testButton = document.getElementById('testChartButton');
    const sampleButton = document.getElementById('sampleChartsButton');
    const chartArea = document.getElementById('aiChartDisplayArea');
    
    if (!testButton) {
        console.error('❌ Test chart button not found');
        return false;
    }
    
    if (!sampleButton) {
        console.error('❌ Sample charts button not found');
        return false;
    }
    
    if (!chartArea) {
        console.error('❌ Chart display area not found');
        return false;
    }
    
    console.log('✅ All chart elements found');
    
    // Clear any existing charts
    chartArea.innerHTML = '';
    
    // Test basic chart generation
    console.log('🔴 Testing basic chart generation...');
    testButton.click();
    
    setTimeout(() => {
        const canvasCount = chartArea.querySelectorAll('canvas').length;
        console.log(`Charts after basic test: ${canvasCount}`);
        
        // Test sample charts
        console.log('🟢 Testing sample chart generation...');
        sampleButton.click();
        
        setTimeout(() => {
            const finalCanvasCount = chartArea.querySelectorAll('canvas').length;
            console.log(`Charts after sample test: ${finalCanvasCount}`);
            
            if (finalCanvasCount > 0) {
                console.log('✅ Chart generation is working correctly!');
                console.log(`Total charts created: ${finalCanvasCount}`);
            } else {
                console.error('❌ No charts were created');
            }
        }, 2000);
    }, 2000);
    
    return true;
}

// Test 3: Check application state
function checkAppState() {
    console.log('🔍 Checking application state...');
    
    // Check if main app class exists
    if (typeof window.app !== 'undefined') {
        console.log('✅ Main app instance found');
        console.log('App methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.app)));
    } else {
        console.log('⚠️ Main app instance not found in window.app');
    }
    
    // Check Chart.js availability
    if (typeof Chart !== 'undefined') {
        console.log(`✅ Chart.js loaded - Version: ${Chart.version || 'unknown'}`);
    } else {
        console.error('❌ Chart.js not loaded');
    }
    
    // Check theme system
    const savedTheme = localStorage.getItem('voice-notes-theme');
    console.log(`Saved theme: ${savedTheme || 'none (defaults to dark)'}`);
    
    return true;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running all validation tests...');
    console.log('==========================================');
    
    checkAppState();
    
    setTimeout(() => {
        testThemeToggle();
    }, 1000);
    
    setTimeout(() => {
        testChartButtons();
    }, 2000);
    
    setTimeout(() => {
        console.log('==========================================');
        console.log('🎉 All tests completed! Check results above.');
    }, 6000);
}

// Auto-run tests
runAllTests();

// Make functions available globally for manual testing
window.testThemeToggle = testThemeToggle;
window.testChartButtons = testChartButtons;
window.checkAppState = checkAppState;
window.runAllTests = runAllTests;

console.log('💡 Functions available for manual testing:');
console.log('- testThemeToggle()');
console.log('- testChartButtons()');
console.log('- checkAppState()');
console.log('- runAllTests()');
