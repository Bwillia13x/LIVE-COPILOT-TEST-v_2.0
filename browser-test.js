// Browser console test - copy and paste this into the browser console on http://localhost:4173/

console.log('🧪 Starting Voice Notes App diagnostics...');

// Test 1: Check if app exists
console.log('\n1️⃣ Testing app instance...');
if (typeof window.app !== 'undefined') {
    console.log('✅ window.app exists');
    console.log('📱 App type:', typeof window.app);
    console.log('🏗️ App constructor:', window.app.constructor.name);
} else {
    console.log('❌ window.app is undefined');
    console.log('🔍 Available window properties containing "app":', 
        Object.keys(window).filter(key => key.toLowerCase().includes('app')));
}

// Test 2: Check DOM elements
console.log('\n2️⃣ Testing DOM elements...');
const recordButton = document.getElementById('recordButton') || document.getElementById('recordBtn');
if (recordButton) {
    console.log('✅ Record button found');
    console.log('🔘 Button disabled:', recordButton.disabled);
    console.log('🎨 Button classes:', recordButton.className);
} else {
    console.log('❌ Record button not found');
    console.log('🔍 Buttons with "record" in ID:', 
        Array.from(document.querySelectorAll('[id*="record" i]')).map(el => el.id));
}

// Test 3: Check for errors
console.log('\n3️⃣ Testing error conditions...');
if (typeof navigator.mediaDevices !== 'undefined') {
    console.log('✅ MediaDevices API available');
} else {
    console.log('❌ MediaDevices API not available');
}

console.log('🌐 Protocol:', location.protocol);
console.log('🏠 Hostname:', location.hostname);

// Test 4: Try to interact with app
console.log('\n4️⃣ Testing app interaction...');
if (window.app) {
    try {
        if (typeof window.app.showToast === 'function') {
            window.app.showToast('Test message from console', 'info');
            console.log('✅ showToast method works');
        } else {
            console.log('❌ showToast method not available');
        }
    } catch (error) {
        console.log('❌ Error calling showToast:', error.message);
    }
    
    // List available methods
    console.log('📋 Available app methods:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.app))
        .filter(name => typeof window.app[name] === 'function' && name !== 'constructor');
    methods.forEach(method => console.log(`   - ${method}`));
} else {
    console.log('❌ Cannot test app interaction - app not available');
}

// Test 5: Manual record button test
console.log('\n5️⃣ Manual record button test...');
if (recordButton && window.app) {
    console.log('🖱️ You can now manually test the record button by clicking it');
    console.log('📝 Watch the console for any errors when clicking');
    
    // Add a test click listener
    recordButton.addEventListener('click', () => {
        console.log('🖱️ Record button clicked!');
        console.log('📊 App recording state:', window.app.isRecording || 'unknown');
    });
} else {
    console.log('❌ Cannot set up manual test - missing button or app');
}

console.log('\n🏁 Diagnostics completed! ');
console.log('💡 If app is working, try clicking the record button now.');

// Return a summary for easy checking
({
    appExists: typeof window.app !== 'undefined',
    recordButtonExists: !!recordButton,
    mediaDevicesAvailable: typeof navigator.mediaDevices !== 'undefined',
    protocol: location.protocol,
    summary: typeof window.app !== 'undefined' ? 'App loaded successfully' : 'App failed to load'
});
