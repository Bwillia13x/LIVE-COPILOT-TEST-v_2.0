// DIRECT SOLUTION: Record Button & Chart Issue Fix
// Paste this directly into the browser console at http://localhost:5173/

console.clear();
console.log('🔧 DIRECT FIX SCRIPT FOR VOICE NOTES APP');
console.log('=' .repeat(50));

// Step 1: Force app initialization if needed
if (!window.app) {
    console.log('⚠️ App not found, attempting to initialize...');
    try {
        // Check if VoiceNotesApp class exists
        if (typeof VoiceNotesApp !== 'undefined') {
            window.app = new VoiceNotesApp();
            console.log('✅ App manually initialized');
        } else {
            console.log('❌ VoiceNotesApp class not available');
        }
    } catch (error) {
        console.log('❌ Manual initialization failed:', error);
    }
}

// Step 2: Find and test record button
const recordButton = document.getElementById('recordButton');
console.log('\n🎤 RECORD BUTTON STATUS:');
if (recordButton) {
    console.log('✅ Record button found');
    console.log('   ID:', recordButton.id);
    console.log('   Classes:', recordButton.className);
    console.log('   Disabled:', recordButton.disabled);
    console.log('   Visible:', recordButton.offsetParent !== null);
    
    // Test click functionality
    console.log('\n🧪 Testing click functionality...');
    recordButton.addEventListener('click', function() {
        console.log('🎯 Record button clicked!');
    });
    
    // Simulate click
    recordButton.click();
    console.log('✅ Click test completed');
} else {
    console.log('❌ Record button not found');
    console.log('Available buttons:');
    document.querySelectorAll('button').forEach((btn, i) => {
        console.log(`  ${i}: ID="${btn.id}" class="${btn.className}"`);
    });
}

// Step 3: Check microphone permissions
console.log('\n🎙️ MICROPHONE STATUS:');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✅ getUserMedia API available');
    
    navigator.permissions.query({ name: 'microphone' }).then(result => {
        console.log('   Permission state:', result.state);
    }).catch(err => {
        console.log('   Permission query error:', err);
    });
} else {
    console.log('❌ getUserMedia API not available');
}

// Step 4: Test chart functionality if available
console.log('\n📊 CHART FUNCTIONALITY:');
if (window.app && typeof window.app.testChartGeneration === 'function') {
    console.log('✅ Chart test function available');
    try {
        window.app.testChartGeneration();
        console.log('✅ Chart test function called');
    } catch (error) {
        console.log('❌ Chart test failed:', error);
    }
} else {
    console.log('⚠️ Chart test function not available');
    if (window.app) {
        console.log('Available app methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.app)));
    }
}

// Step 5: Manual fixes
console.log('\n🔧 APPLYING MANUAL FIXES:');

// Fix 1: Ensure record button is clickable
if (recordButton) {
    recordButton.disabled = false;
    recordButton.style.pointerEvents = 'auto';
    console.log('✅ Record button enabled');
}

// Fix 2: Force bind event listeners if app exists
if (window.app && typeof window.app.bindEventListeners === 'function') {
    try {
        window.app.bindEventListeners();
        console.log('✅ Event listeners rebound');
    } catch (error) {
        console.log('❌ Event listener binding failed:', error);
    }
}

// Fix 3: Test chart button
const testChartButton = document.getElementById('testChartButton');
if (testChartButton) {
    console.log('✅ Test chart button found');
    testChartButton.addEventListener('click', function() {
        console.log('📊 Chart button clicked!');
        if (window.app && typeof window.app.testChartGeneration === 'function') {
            window.app.testChartGeneration();
        }
    });
} else {
    console.log('⚠️ Test chart button not found');
}

console.log('\n' + '='.repeat(50));
console.log('🎉 FIX SCRIPT COMPLETE!');
console.log('🎯 Next steps:');
console.log('   1. Try clicking the record button');
console.log('   2. Grant microphone permission if prompted');
console.log('   3. Try the red chart test button for chart functionality');
console.log('   4. Check this console for any errors');
