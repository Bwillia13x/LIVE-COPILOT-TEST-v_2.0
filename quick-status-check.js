// Quick Status Check - Run this in browser console at http://localhost:5173/
console.clear();
console.log('🔍 QUICK STATUS CHECK');
console.log('Current URL:', window.location.href);
console.log('DOM Ready State:', document.readyState);

// Check record button
const recordButton = document.getElementById('recordButton');
console.log('\n🎤 RECORD BUTTON:');
if (recordButton) {
    console.log('✅ FOUND - Record button exists');
    console.log('   - ID:', recordButton.id);
    console.log('   - Classes:', recordButton.className);
    console.log('   - Disabled:', recordButton.disabled);
    console.log('   - Visible:', recordButton.offsetParent !== null);
} else {
    console.log('❌ NOT FOUND - Record button missing');
}

// Check app instance
console.log('\n🧩 APP INSTANCE:');
if (window.app) {
    console.log('✅ FOUND - App instance exists');
    console.log('   - Type:', typeof window.app);
} else {
    console.log('❌ NOT FOUND - App instance missing');
}

// Quick test
if (recordButton && window.app) {
    console.log('\n🎉 STATUS: LIKELY WORKING');
    console.log('Both record button and app instance found!');
} else {
    console.log('\n⚠️ STATUS: NEEDS ATTENTION');
    console.log('Missing required components');
}
