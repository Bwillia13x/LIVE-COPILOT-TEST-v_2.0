// Simple Chart Test Script
console.log('🔍 Testing Chart Functionality...');

// Test 1: Check if Chart.js is loaded
function testChartJSLoading() {
    console.log('📊 Testing Chart.js loading...');
    if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js is loaded!', Chart.version);
        return true;
    } else {
        console.error('❌ Chart.js is not loaded');
        return false;
    }
}

// Test 2: Check if main app exists
function testMainApp() {
    console.log('🚀 Testing main app...');
    if (window.app) {
        console.log('✅ Main app found:', window.app);
        return true;
    } else {
        console.error('❌ Main app (window.app) not found');
        return false;
    }
}

// Test 3: Check for chart functions
function testChartFunctions() {
    console.log('🔧 Testing chart functions...');
    if (window.app && typeof window.app.testChartWithoutAI === 'function') {
        console.log('✅ Chart test function found');
        return true;
    } else {
        console.error('❌ Chart test function not found');
        return false;
    }
}

// Test 4: Try to create a simple chart
function testCreateChart() {
    console.log('🎨 Testing chart creation...');
    try {
        // Find or create a canvas element for testing
        let canvas = document.getElementById('test-chart-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'test-chart-canvas';
            canvas.width = 400;
            canvas.height = 200;
            canvas.style.display = 'none'; // Hidden test canvas
            document.body.appendChild(canvas);
        }

        const ctx = canvas.getContext('2d');
        const testChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Test'],
                datasets: [{
                    label: 'Test Data',
                    data: [1],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Chart'
                    }
                }
            }
        });

        console.log('✅ Test chart created successfully!', testChart);
        return true;
    } catch (error) {
        console.error('❌ Error creating test chart:', error);
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running comprehensive chart tests...');
    
    const results = {
        chartJSLoaded: false,
        mainAppFound: false,
        chartFunctionsFound: false,
        chartCreationWorking: false
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
        runTests();
    } else {
        window.addEventListener('load', runTests);
    }

    function runTests() {
        setTimeout(() => {
            results.chartJSLoaded = testChartJSLoading();
            results.mainAppFound = testMainApp();
            results.chartFunctionsFound = testChartFunctions();
            results.chartCreationWorking = testCreateChart();

            console.log('📊 Test Results:', results);
            
            const allPassed = Object.values(results).every(result => result === true);
            if (allPassed) {
                console.log('🎉 All chart tests passed!');
            } else {
                console.log('⚠️ Some chart tests failed. Check the results above.');
            }

            // Try to trigger the main app chart test if available
            if (results.chartFunctionsFound && window.app.testChartWithoutAI) {
                console.log('🎯 Triggering main app chart test...');
                try {
                    window.app.testChartWithoutAI();
                    console.log('✅ Main app chart test triggered successfully');
                } catch (error) {
                    console.error('❌ Error triggering main app chart test:', error);
                }
            }
        }, 1000); // Give time for everything to load
    }
}

// Export for global access
window.chartTest = {
    runAllTests,
    testChartJSLoading,
    testMainApp,
    testChartFunctions,
    testCreateChart
};

// Auto-run tests
runAllTests();
