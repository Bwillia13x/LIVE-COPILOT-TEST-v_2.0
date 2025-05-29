// Manual Chart Test Trigger Script
console.log('🎯 Manual Chart Test Trigger Loading...');

function waitForApp() {
    if (window.app) {
        console.log('✅ Found window.app, testing chart functionality...');
        
        // Test direct chart creation first
        console.log('🧪 Testing direct chart creation...');
        window.app.testChartWithoutAI();
        
        // Test sample charts after a short delay
        setTimeout(() => {
            console.log('🧪 Testing sample chart generation...');
            window.app.generateSampleCharts();
        }, 2000);
        
        // Show success message
        setTimeout(() => {
            console.log('🎉 Chart tests completed! Check the Raw tab for results.');
        }, 4000);
        
    } else {
        console.log('⏳ Waiting for app to initialize...');
        setTimeout(waitForApp, 500);
    }
}

// Start checking for app availability
setTimeout(waitForApp, 1000);
