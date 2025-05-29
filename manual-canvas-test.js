// Manual Canvas Fix Test
// Run this in browser console to test the canvas fix

console.log('🧪 Manual Canvas Fix Test');

function testCanvasFix() {
    console.log('🔍 Testing canvas element creation and lookup...');
    
    // Test 1: Direct createElement approach
    console.log('\n📝 Test 1: Direct createElement');
    const container1 = document.createElement('div');
    const canvas1 = document.createElement('canvas');
    canvas1.id = 'test-canvas-1';
    container1.appendChild(canvas1);
    document.body.appendChild(container1);
    
    const found1 = document.getElementById('test-canvas-1');
    console.log(`✅ Direct createElement - Found: ${!!found1}`);
    
    // Test 2: innerHTML approach (old method)
    console.log('\n📝 Test 2: innerHTML approach');
    const container2 = document.createElement('div');
    container2.innerHTML = '<canvas id="test-canvas-2"></canvas>';
    document.body.appendChild(container2);
    
    const found2 = document.getElementById('test-canvas-2');
    console.log(`❓ innerHTML + getElementById - Found: ${!!found2}`);
    
    // Test 3: innerHTML + querySelector (new method)
    console.log('\n📝 Test 3: innerHTML + querySelector');
    const container3 = document.createElement('div');
    container3.innerHTML = '<canvas id="test-canvas-3"></canvas>';
    document.body.appendChild(container3);
    
    const found3 = container3.querySelector('#test-canvas-3');
    console.log(`✅ innerHTML + querySelector - Found: ${!!found3}`);
    
    // Clean up
    container1.remove();
    container2.remove();
    container3.remove();
    
    console.log('\n🎯 Canvas Fix Test Results:');
    console.log(`✅ Direct createElement: ${!!found1 ? 'WORKS' : 'FAILS'}`);
    console.log(`❓ innerHTML + getElementById: ${!!found2 ? 'WORKS' : 'FAILS'}`);
    console.log(`✅ innerHTML + querySelector: ${!!found3 ? 'WORKS' : 'FAILS'}`);
    
    if (found3 && !found2) {
        console.log('🎉 CONFIRMED: querySelector fix resolves the timing issue!');
    }
}

// Run test
testCanvasFix();

// Test actual chart functions if available
setTimeout(() => {
    if (window.app) {
        console.log('\n🚀 Testing actual chart functions...');
        
        // Test the fixed chart function
        try {
            window.app.testChartWithoutAI();
            console.log('✅ testChartWithoutAI() executed');
            
            setTimeout(() => {
                const chartArea = document.getElementById('aiChartDisplayArea');
                const canvases = chartArea ? chartArea.querySelectorAll('canvas') : [];
                console.log(`📊 Charts created: ${canvases.length}`);
                
                if (canvases.length > 0) {
                    console.log('🎉 SUCCESS: Canvas fix is working in production!');
                } else {
                    console.log('❌ ISSUE: Still no canvas elements found');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Chart test failed:', error);
        }
    } else {
        console.log('⏳ App not loaded yet');
    }
}, 3000);
