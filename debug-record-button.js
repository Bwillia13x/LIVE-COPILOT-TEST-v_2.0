// Record Button Debug Script
// This script can be run in the browser console to debug the record button

console.log('🔍 RECORD BUTTON DEBUG SCRIPT STARTING...');

// Test 1: Check if app exists
console.log('=== TEST 1: APP INSTANCE ===');
if (typeof app !== 'undefined') {
    console.log('✅ App instance exists:', app);
    console.log('✅ App constructor name:', app.constructor.name);
} else {
    console.error('❌ App instance not found - this is likely the main issue');
    console.log('🔍 Available global variables:', Object.keys(window).filter(k => !k.startsWith('webkit')));
}

// Test 2: Check DOM elements
console.log('=== TEST 2: DOM ELEMENTS ===');
const recordButton = document.getElementById('recordButton');
console.log('Record button element:', recordButton);
console.log('Record button exists:', !!recordButton);

if (recordButton) {
    console.log('✅ Record button found');
    console.log('  - ID:', recordButton.id);
    console.log('  - Classes:', recordButton.className);
    console.log('  - Tag name:', recordButton.tagName);
    console.log('  - Disabled:', recordButton.disabled);
    console.log('  - Style display:', recordButton.style.display);
    console.log('  - Event listeners:', getEventListeners ? getEventListeners(recordButton) : 'getEventListeners not available');
} else {
    console.error('❌ Record button not found in DOM');
    console.log('🔍 All buttons:', document.querySelectorAll('button').length);
    console.log('🔍 All elements with recordButton ID:', document.querySelectorAll('#recordButton').length);
    console.log('🔍 Elements with "record" in ID:', [...document.querySelectorAll('[id*="record"]')].map(el => el.id));
}

// Test 3: Check if DOMContentLoaded fired
console.log('=== TEST 3: DOM STATE ===');
console.log('Document ready state:', document.readyState);
console.log('DOM fully loaded:', document.readyState === 'complete');

// Test 4: Check for JavaScript errors
console.log('=== TEST 4: ERROR CHECKING ===');
window.addEventListener('error', function(e) {
    console.error('🚨 JavaScript error detected:', e.error);
});

// Test 5: Check network and loading
console.log('=== TEST 5: RESOURCES ===');
const scripts = [...document.querySelectorAll('script[src]')];
console.log('External scripts:', scripts.map(s => s.src));

// Test 6: Manual button test
if (recordButton && typeof app !== 'undefined') {
    console.log('=== TEST 6: MANUAL BUTTON TEST ===');
    console.log('🧪 Testing manual button click...');
    
    // Check current recording state
    console.log('Current recording state:', app.isRecording);
    
    // Try clicking the button
    try {
        recordButton.click();
        console.log('✅ Button click executed');
        console.log('New recording state:', app.isRecording);
    } catch (error) {
        console.error('❌ Button click failed:', error);
    }
}

console.log('🔍 DEBUG SCRIPT COMPLETED');
