// 🧪 SIMPLE RECORD BUTTON TEST
// Copy and paste this into the browser console at http://localhost:5173/

console.log('🧪 RECORD BUTTON TEST STARTING...');

// Step 1: Check if main app exists
console.log('Step 1: Checking for main app...');
if (typeof window.app === 'undefined') {
    console.error('❌ Main app not found! Check app initialization.');
    console.log('🔍 Available on window:', Object.keys(window).filter(k => k.includes('app')));
} else {
    console.log('✅ Main app found:', window.app.constructor.name);
}

// Step 2: Check record button in DOM
console.log('Step 2: Checking record button in DOM...');
const domButton = document.getElementById('recordButton');
if (!domButton) {
    console.error('❌ Record button not found in DOM!');
} else {
    console.log('✅ Record button found in DOM:', domButton.tagName);
    console.log('🔍 Button classes:', domButton.className);
}

// Step 3: Check app's record button reference
console.log('Step 3: Checking app record button reference...');
if (window.app && window.app.recordButton) {
    console.log('✅ App has record button reference');
    console.log('🔍 Button references match:', window.app.recordButton === domButton);
} else {
    console.error('❌ App does not have record button reference');
}

// Step 4: Test button click
console.log('Step 4: Testing button click...');
if (domButton) {
    console.log('🎤 Clicking record button...');
    domButton.click();
    
    setTimeout(() => {
        console.log('📊 After click - Button classes:', domButton.className);
        console.log('📊 After click - Is recording:', window.app?.isRecording);
        
        // If recording started, stop it
        if (domButton.classList.contains('recording')) {
            console.log('✅ Recording started! Stopping in 2 seconds...');
            setTimeout(() => {
                domButton.click();
                console.log('✅ Recording stopped');
            }, 2000);
        } else {
            console.log('❓ Recording may not have started. Check browser permissions.');
        }
    }, 500);
} else {
    console.log('❌ Cannot test - button not found');
}

console.log('🧪 Test script completed. Watch for results above...');
