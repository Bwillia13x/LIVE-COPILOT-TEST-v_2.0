/**
 * Button Debug Script
 * Run this in the browser console at http://localhost:5177 to debug button issues
 */

console.log('🔧 BUTTON DEBUG SCRIPT STARTING...');
console.log('Current URL:', location.href);

// Check if we're on the right URL
if (!location.href.includes('localhost:5177')) {
    console.warn('⚠️ Note: Expected localhost:5177, current URL:', location.href);
}

console.log('\n=== 1. APP INSTANCE CHECK ===');
console.log('window.app:', window.app);
console.log('window.audioApp:', window.audioApp);

if (window.app) {
    console.log('✅ App instance found');
    console.log('   Constructor:', window.app.constructor.name);
    console.log('   Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.app)).filter(name => name !== 'constructor'));
} else {
    console.error('❌ No app instance found in window object');
    console.log('   Available window properties:', Object.keys(window).filter(k => !k.startsWith('webkit') && typeof window[k] === 'object').slice(0, 10));
}

console.log('\n=== 2. DOM ELEMENTS CHECK ===');
const buttons = [
    'recordButton',
    'settingsButton', 
    'polishButton',
    'generateChartsButton',
    'saveButton',
    'clearButton',
    'newButton'
];

buttons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    console.log(`${buttonId}: ${button ? '✅ Found' : '❌ Missing'}`, button ? `(${button.tagName})` : '');
    
    if (button) {
        console.log(`   - Disabled: ${button.disabled}`);
        console.log(`   - Display: ${getComputedStyle(button).display}`);
        console.log(`   - Pointer events: ${getComputedStyle(button).pointerEvents}`);
        console.log(`   - Classes: ${button.className}`);
    }
});

console.log('\n=== 3. EVENT LISTENER TEST ===');
const recordButton = document.getElementById('recordButton');

if (recordButton) {
    console.log('Testing record button click handling...');
    
    // Add test listener
    let testClicks = 0;
    const testHandler = (e) => {
        testClicks++;
        console.log(`🎯 TEST CLICK #${testClicks} detected!`, e);
    };
    
    recordButton.addEventListener('click', testHandler);
    console.log('✅ Test listener added');
    
    // Test click
    console.log('Triggering test click...');
    recordButton.click();
    
    setTimeout(() => {
        console.log(`Test result: ${testClicks > 0 ? '✅ Click event working' : '❌ Click event not working'}`);
        recordButton.removeEventListener('click', testHandler);
        console.log('✅ Test listener removed');
    }, 100);
} else {
    console.error('❌ Cannot test - record button not found');
}

console.log('\n=== 4. CONSOLE ERROR CHECK ===');
const originalError = console.error;
const errors = [];

console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
};

setTimeout(() => {
    console.error = originalError;
    console.log(`Captured ${errors.length} console errors:`);
    errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
    });
    
    if (errors.length === 0) {
        console.log('✅ No console errors detected');
    }
}, 1000);

console.log('\n=== 5. MANUAL BUTTON TEST ===');
console.log('Try clicking buttons manually and check for responses...');

// Set up click monitoring for all buttons
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
        console.log(`🖱️ Button clicked: ID="${button.id}" class="${button.className}"`);
    }
}, true);

console.log('✅ Click monitoring active - click any button to see if events are working');

console.log('\n=== DEBUG COMPLETE ===');
console.log('Check the results above to identify button issues');
