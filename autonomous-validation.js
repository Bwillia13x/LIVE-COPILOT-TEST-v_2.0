
// Test chart functionality after page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting autonomous chart validation...');
    
    setTimeout(() => {
        // Test 1: Chart.js availability
        const chartJSAvailable = typeof Chart !== 'undefined';
        console.log('Chart.js available:', chartJSAvailable ? '✅' : '❌');
        
        // Test 2: Chart display area
        const chartArea = document.getElementById('aiChartDisplayArea');
        console.log('Chart area found:', chartArea ? '✅' : '❌');
        
        // Test 3: App instance
        const appAvailable = typeof window.app !== 'undefined';
        console.log('App instance available:', appAvailable ? '✅' : '❌');
        
        // Test 4: Switch to raw tab
        const rawTab = document.querySelector('[data-tab="raw"]');
        if (rawTab) {
            rawTab.click();
            console.log('Switched to Raw tab ✅');
            
            setTimeout(() => {
                // Test 5: Chart generation
                if (window.app && window.app.testChartGeneration) {
                    try {
                        window.app.testChartGeneration();
                        console.log('Chart generation executed ✅');
                        
                        setTimeout(() => {
                            const canvases = document.querySelectorAll('canvas');
                            console.log('Canvas elements found:', canvases.length);
                            
                            if (canvases.length > 0) {
                                console.log('🎉 CHART FUNCTIONALITY WORKING!');
                            } else {
                                console.log('⚠️ No canvas elements found after generation');
                            }
                        }, 1000);
                        
                    } catch (error) {
                        console.error('Chart generation failed:', error);
                    }
                } else {
                    console.log('❌ Chart generation method not available');
                }
            }, 500);
        } else {
            console.log('❌ Raw tab not found');
        }
    }, 2000);
});
