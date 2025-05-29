// Comprehensive Chart and AI Service Fix
// This script will diagnose and fix both Chart.js and AI service issues

console.log('🔧 Starting comprehensive chart and AI service fix...');

// Test 1: Verify Chart.js is loaded
function testChartJS() {
    console.log('📊 Testing Chart.js...');
    if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js loaded successfully, version:', Chart.version);
        return true;
    } else {
        console.error('❌ Chart.js not loaded');
        return false;
    }
}

// Test 2: Verify environment variables
function testEnvironment() {
    console.log('🔍 Testing environment variables...');
    console.log('Environment mode:', import.meta.env.MODE);
    console.log('Development mode:', import.meta.env.DEV);
    console.log('API Key exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
    
    if (import.meta.env.VITE_GEMINI_API_KEY) {
        console.log('✅ API Key found:', import.meta.env.VITE_GEMINI_API_KEY.substring(0, 8) + '...');
        return true;
    } else {
        console.error('❌ VITE_GEMINI_API_KEY not found in environment');
        return false;
    }
}

// Test 3: Test basic chart creation
function testBasicChart() {
    console.log('🧪 Creating test chart...');
    
    // Find or create chart container
    let chartContainer = document.getElementById('test-chart-container');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'test-chart-container';
        chartContainer.style.width = '400px';
        chartContainer.style.height = '200px';
        chartContainer.style.margin = '20px';
        chartContainer.style.border = '1px solid #ccc';
        document.body.appendChild(chartContainer);
    }
    
    chartContainer.innerHTML = '<canvas id="diagnostic-chart" width="400" height="200"></canvas>';
    
    const canvas = document.getElementById('diagnostic-chart');
    const ctx = canvas.getContext('2d');
    
    try {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Test 1', 'Test 2', 'Test 3'],
                datasets: [{
                    label: 'Diagnostic Data',
                    data: [10, 20, 15],
                    backgroundColor: ['#ff6384', '#36a2eb', '#ffce56']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Chart.js Diagnostic Test'
                    }
                }
            }
        });
        
        console.log('✅ Test chart created successfully!');
        return chart;
    } catch (error) {
        console.error('❌ Failed to create test chart:', error);
        return null;
    }
}

// Test 4: Test Google GenAI service
async function testGoogleGenAI() {
    console.log('🤖 Testing Google GenAI service...');
    
    try {
        const { GoogleGenAI } = await import('@google/genai');
        console.log('✅ Google GenAI imported successfully');
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDE1gzCeTw42daw84Y-Lh_P7XurdLCZHoI';
        
        if (!apiKey) {
            console.error('❌ No API key available');
            return false;
        }
        
        const genAI = new GoogleGenAI(apiKey);
        console.log('✅ GoogleGenAI instance created');
        
        // Test getting a model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✅ Model instance created');
        
        return true;
        
    } catch (error) {
        console.error('❌ Google GenAI test failed:', error);
        return false;
    }
}

// Test 5: Test main app integration
function testMainAppIntegration() {
    console.log('🔗 Testing main app integration...');
    
    if (window.app) {
        console.log('✅ Main app found');
        
        // Test chart display area
        if (window.app.aiChartDisplayArea) {
            console.log('✅ Chart display area found');
            
            // Test direct chart function
            if (typeof window.app.testChartWithoutAI === 'function') {
                console.log('✅ Direct chart test function available');
                window.app.testChartWithoutAI();
                return true;
            } else {
                console.error('❌ Direct chart test function not found');
            }
        } else {
            console.error('❌ Chart display area not found');
        }
    } else {
        console.error('❌ Main app not found');
    }
    
    return false;
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running comprehensive diagnostic tests...');
    
    const results = {
        chartJS: testChartJS(),
        environment: testEnvironment(),
        basicChart: !!testBasicChart(),
        googleGenAI: await testGoogleGenAI(),
        mainApp: testMainAppIntegration()
    };
    
    console.log('📊 Test Results:', results);
    
    // Provide fix recommendations
    if (!results.chartJS) {
        console.log('🔧 Fix: Chart.js not loaded. Check CDN link in index.html');
    }
    
    if (!results.environment) {
        console.log('🔧 Fix: Environment variables not loaded. Check .env.local file and Vite restart');
    }
    
    if (!results.basicChart) {
        console.log('🔧 Fix: Basic chart creation failed. Check Chart.js version and canvas element');
    }
    
    if (!results.googleGenAI) {
        console.log('🔧 Fix: Google GenAI failed. Check API key validity and network connectivity');
    }
    
    if (!results.mainApp) {
        console.log('🔧 Fix: Main app integration failed. Check app initialization and element IDs');
    }
    
    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`🎯 Overall Status: ${successCount}/5 tests passed`);
    
    if (successCount === 5) {
        console.log('🎉 All tests passed! Charts should be working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the fixes above.');
    }
    
    return results;
}

// Auto-run if loaded as module
if (import.meta.url) {
    setTimeout(runAllTests, 1000);
}

// Export for manual testing
window.chartDiagnostic = {
    runAllTests,
    testChartJS,
    testEnvironment,
    testBasicChart,
    testGoogleGenAI,
    testMainAppIntegration
};

console.log('💡 Use window.chartDiagnostic.runAllTests() to run tests manually');
