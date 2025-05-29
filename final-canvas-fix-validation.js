// Final Chart Canvas Fix Validation
// Comprehensive test of all chart creation functions

console.log('🎯 CHART CANVAS FIX - FINAL VALIDATION');
console.log('=====================================');

function runFinalValidation() {
    console.log('🚀 Starting final validation of chart canvas fix...');
    
    if (!window.app) {
        console.log('⏳ Waiting for app to initialize...');
        setTimeout(runFinalValidation, 1000);
        return;
    }
    
    console.log('✅ App loaded successfully');
    
    const tests = [
        {
            name: 'testChartWithoutAI',
            func: () => window.app.testChartWithoutAI(),
            description: 'Basic chart creation test'
        },
        {
            name: 'generateSampleCharts', 
            func: () => window.app.generateSampleCharts(),
            description: 'Sample charts generation test'
        }
    ];
    
    let currentTest = 0;
    
    function runNextTest() {
        if (currentTest >= tests.length) {
            setTimeout(generateFinalReport, 3000);
            return;
        }
        
        const test = tests[currentTest];
        console.log(`\n🧪 Test ${currentTest + 1}: ${test.name}`);
        console.log(`📋 ${test.description}`);
        
        try {
            test.func();
            console.log(`✅ ${test.name}() executed without errors`);
        } catch (error) {
            console.error(`❌ ${test.name}() failed:`, error);
        }
        
        currentTest++;
        setTimeout(runNextTest, 2000);
    }
    
    function generateFinalReport() {
        console.log('\n📊 FINAL VALIDATION REPORT');
        console.log('==========================');
        
        const chartArea = document.getElementById('aiChartDisplayArea');
        if (!chartArea) {
            console.log('❌ Chart display area not found');
            return;
        }
        
        const canvases = chartArea.querySelectorAll('canvas');
        const containers = chartArea.querySelectorAll('.chart-container');
        const charts = document.querySelectorAll('canvas[id*="chart"]');
        
        console.log(`📊 Canvas elements found: ${canvases.length}`);
        console.log(`📦 Chart containers found: ${containers.length}`);
        console.log(`🎯 Total chart elements: ${charts.length}`);
        
        // Check for specific chart types
        const directCharts = chartArea.querySelectorAll('canvas[id*="direct-chart"]');
        const sampleCharts = chartArea.querySelectorAll('canvas[id*="ai-chart"]');
        const topicCharts = chartArea.querySelectorAll('canvas[id*="topics-chart"]');
        const sentimentCharts = chartArea.querySelectorAll('canvas[id*="sentiment-chart"]');
        const wordCharts = chartArea.querySelectorAll('canvas[id*="words-chart"]');
        
        console.log(`📈 Direct test charts: ${directCharts.length}`);
        console.log(`📊 AI sample charts: ${sampleCharts.length}`);
        console.log(`🏷️  Topic charts: ${topicCharts.length}`);
        console.log(`😊 Sentiment charts: ${sentimentCharts.length}`);
        console.log(`📝 Word frequency charts: ${wordCharts.length}`);
        
        // Overall assessment
        if (canvases.length > 0) {
            console.log('\n🎉 CHART CANVAS FIX: SUCCESS!');
            console.log('✅ Canvas elements are being created properly');
            console.log('✅ querySelector fix is working');
            console.log('✅ Charts should now render correctly');
            
            if (canvases.length >= 3) {
                console.log('🌟 EXCELLENT: Multiple chart types working');
            }
        } else {
            console.log('\n❌ CHART CANVAS FIX: STILL HAS ISSUES');
            console.log('⚠️  No canvas elements found');
            console.log('🔧 May need additional debugging');
        }
        
        console.log('\n🔍 TECHNICAL DETAILS:');
        console.log(`🔧 Chart ID counter would be at: ${window.app.chartIdCounter || 'unknown'}`);
        console.log(`📱 Chart display area exists: ${!!chartArea}`);
        console.log(`🧹 Active chart instances: ${window.app.activeAiChartInstances ? window.app.activeAiChartInstances.length : 'unknown'}`);
        
        // Test canvas accessibility
        canvases.forEach((canvas, index) => {
            const id = canvas.id;
            const context = canvas.getContext('2d');
            console.log(`🎨 Canvas ${index + 1}: ID="${id}", Context=${!!context ? 'Available' : 'Not Available'}`);
        });
        
        console.log('\n🎯 CANVAS FIX VALIDATION COMPLETE!');
    }
    
    runNextTest();
}

// Auto-run validation
setTimeout(runFinalValidation, 2000);
