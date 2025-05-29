// Chart Canvas Fix Validation Script
// Tests that the canvas element lookup fix is working

console.log('🧪 Testing Chart Canvas Fix...');

function testChartFunctionality() {
    console.log('📊 Testing Chart Functionality After Canvas Fix');
    
    // Wait for app to be available
    if (!window.app) {
        console.log('⏳ Waiting for app to initialize...');
        setTimeout(testChartFunctionality, 1000);
        return;
    }
    
    console.log('✅ App is available');
    
    // Test 1: Test Chart Without AI
    console.log('\n🧪 Test 1: Running testChartWithoutAI()');
    try {
        window.app.testChartWithoutAI();
        console.log('✅ testChartWithoutAI() executed without errors');
        setTimeout(() => {
            const chartArea = document.getElementById('aiChartDisplayArea');
            const canvasElements = chartArea ? chartArea.querySelectorAll('canvas') : [];
            console.log(`📊 Found ${canvasElements.length} canvas element(s) in chart area`);
            
            if (canvasElements.length > 0) {
                console.log('✅ Canvas elements successfully created and found!');
                console.log('🎯 Canvas Fix: SUCCESS');
            } else {
                console.log('❌ No canvas elements found after chart creation');
                console.log('🎯 Canvas Fix: FAILED');
            }
        }, 500);
    } catch (error) {
        console.error('❌ testChartWithoutAI() failed:', error);
    }
    
    // Test 2: Test Sample Charts
    setTimeout(() => {
        console.log('\n🧪 Test 2: Running generateSampleCharts()');
        try {
            window.app.generateSampleCharts();
            console.log('✅ generateSampleCharts() executed without errors');
            setTimeout(() => {
                const chartArea = document.getElementById('aiChartDisplayArea');
                const canvasElements = chartArea ? chartArea.querySelectorAll('canvas') : [];
                console.log(`📊 Found ${canvasElements.length} canvas element(s) after sample charts`);
                
                if (canvasElements.length > 0) {
                    console.log('✅ Sample charts canvas elements successfully created!');
                    console.log('🎯 Sample Charts Fix: SUCCESS');
                } else {
                    console.log('❌ No canvas elements found after sample chart creation');
                    console.log('🎯 Sample Charts Fix: FAILED');
                }
            }, 1000);
        } catch (error) {
            console.error('❌ generateSampleCharts() failed:', error);
        }
    }, 2000);
    
    // Final report
    setTimeout(() => {
        console.log('\n📋 Chart Canvas Fix Test Report:');
        const chartArea = document.getElementById('aiChartDisplayArea');
        const canvasElements = chartArea ? chartArea.querySelectorAll('canvas') : [];
        const chartContainers = chartArea ? chartArea.querySelectorAll('.chart-container') : [];
        
        console.log(`📊 Total canvas elements: ${canvasElements.length}`);
        console.log(`📦 Total chart containers: ${chartContainers.length}`);
        
        if (canvasElements.length > 0) {
            console.log('🎉 CHART CANVAS FIX: SUCCESSFUL!');
            console.log('✅ Charts are now rendering properly');
            console.log('✅ Canvas element lookup issue resolved');
        } else {
            console.log('❌ CHART CANVAS FIX: NEEDS MORE WORK');
            console.log('⚠️ Canvas elements still not being created or found');
        }
    }, 4000);
}

// Start the test
testChartFunctionality();
