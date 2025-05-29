// Console test script for Voice Notes App Record Button
// Paste this directly into the browser console when the app is loaded at http://localhost:5173/

console.log('🔍 Voice Notes App - Record Button Debug Test');
console.log('='.repeat(50));

// Test 1: Check if app instance exists
console.log('1. Testing app instance...');
if (typeof window.voiceNotesApp !== 'undefined') {
    console.log('✅ VoiceNotesApp instance found:', window.voiceNotesApp);
} else {
    console.log('❌ VoiceNotesApp instance not found in window object');
}

// Test 2: Check DOM elements
console.log('\n2. Testing DOM elements...');
const recordButton = document.getElementById('recordButton');
if (recordButton) {
    console.log('✅ Record button found:', recordButton);
    console.log('   - Button text:', recordButton.textContent);
    console.log('   - Button classes:', recordButton.className);
    console.log('   - Button disabled:', recordButton.disabled);
} else {
    console.log('❌ Record button not found');
}

// Test 3: Check event listeners
console.log('\n3. Testing event listeners...');
if (recordButton) {
    const events = getEventListeners(recordButton);
    if (events && events.click && events.click.length > 0) {
        console.log('✅ Click event listeners found:', events.click.length);
        console.log('   - Event details:', events.click);
    } else {
        console.log('❌ No click event listeners found');
    }
} else {
    console.log('⚠️ Cannot test event listeners - button not found');
}

// Test 4: Simulate click
console.log('\n4. Testing button click simulation...');
if (recordButton) {
    console.log('Simulating click...');
    recordButton.click();
    console.log('✅ Click simulation completed');
} else {
    console.log('❌ Cannot simulate click - button not found');
}

// Test 5: Check microphone permissions
console.log('\n5. Testing microphone permissions...');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✅ getUserMedia API available');
    navigator.permissions.query({ name: 'microphone' }).then(result => {
        console.log('   - Microphone permission state:', result.state);
    }).catch(err => {
        console.log('   - Permission query error:', err);
    });
} else {
    console.log('❌ getUserMedia API not available');
}

// Test 6: Manual click test
console.log('\n6. Manual click test...');
console.log('Please manually click the record button and check:');
console.log('   - Does the button text change?');
console.log('   - Does the browser ask for microphone permission?');
console.log('   - Are there any console errors?');
console.log('   - Does the recording indicator appear?');

console.log('\n='.repeat(50));
console.log('🔍 Debug test completed. Check results above.');
