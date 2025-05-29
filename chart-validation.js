// Chart functionality validation script
console.log('🔧 Chart Validation Script Started');

function validateChartFunctionality() {
    console.log('🔍 Validating chart functionality...');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded');
        return false;
    }
    console.log('✅ Chart.js is loaded');
    
    // Check if app is available
    if (typeof window.app === 'undefined') {
        console.error('❌ App not available on window.app');
        return false;
    }
    console.log('✅ App is available on window.app');
    
    // Check if chart display area exists
    const chartArea = document.getElementById('aiChartDisplayArea');
    if (!chartArea) {
        console.error('❌ Chart display area not found');
        return false;
    }
    console.log('✅ Chart display area found');
    
    // Check if chart display area is visible
    const computedStyle = window.getComputedStyle(chartArea);
    console.log('📊 Chart area display style:', computedStyle.display);
    console.log('📊 Chart area visibility:', computedStyle.visibility);
    console.log('📊 Chart area position in DOM:', chartArea.offsetParent ? 'visible' : 'hidden');
    
    // Check current tab state
    const rawTab = document.querySelector('[data-tab="raw"]');
    const polishedTab = document.querySelector('[data-tab="note"]');
    const rawContent = document.getElementById('rawTranscription');
    
    console.log('📑 Raw tab element:', !!rawTab);
    console.log('📑 Polished tab element:', !!polishedTab);
    console.log('📑 Raw content active:', rawContent?.classList.contains('active'));
    
    return true;
}

function testChartGeneration() {
    console.log('🧪 Testing chart generation...');
    
    if (!validateChartFunctionality()) {
        console.error('❌ Chart functionality validation failed');
        return;
    }
    
    // Switch to Raw tab first to ensure chart area is visible
    const rawTabButton = document.querySelector('[data-tab="raw"]');
    if (rawTabButton) {
        console.log('📑 Switching to Raw tab...');
        rawTabButton.click();
        
        // Wait a bit for tab switch to complete
        setTimeout(() => {
            // Now test chart generation
            if (window.app && typeof window.app.testChartGeneration === 'function') {
                console.log('🧪 Calling window.app.testChartGeneration()...');
                window.app.testChartGeneration();
            } else {
                console.error('❌ testChartGeneration method not available');
            }
        }, 500);
    } else {
        console.error('❌ Raw tab button not found');
    }
}

function checkChartResults() {
    console.log('📊 Checking chart results...');
    
    const chartArea = document.getElementById('aiChartDisplayArea');
    if (chartArea) {
        console.log('📊 Chart area children count:', chartArea.children.length);
        console.log('📊 Chart area HTML length:', chartArea.innerHTML.length);
        
        const canvases = chartArea.querySelectorAll('canvas');
        console.log('📊 Canvas elements in chart area:', canvases.length);
        
        if (canvases.length > 0) {
            console.log('✅ Charts appear to be rendered!');
            canvases.forEach((canvas, index) => {
                console.log(`📊 Canvas ${index + 1}:`, {
                    id: canvas.id,
                    width: canvas.width,
                    height: canvas.height,
                    visible: canvas.offsetParent !== null
                });
            });
        } else {
            console.log('⚠️ No canvas elements found in chart area');
        }
    }
}

// Export functions for manual testing
window.validateChartFunctionality = validateChartFunctionality;
window.testChartGeneration = testChartGeneration;
window.checkChartResults = checkChartResults;

// Auto-run validation when script loads
console.log('🚀 Running automatic validation...');
setTimeout(() => {
    validateChartFunctionality();
    
    // Test chart generation after app loads
    setTimeout(() => {
        testChartGeneration();
        
        // Check results after a short delay
        setTimeout(() => {
            checkChartResults();
        }, 2000);
    }, 2000);
}, 1000);
