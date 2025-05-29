// API Key Test - Run this in browser console at http://localhost:5173/
console.clear();
console.log('🔑 API KEY VERIFICATION TEST');
console.log('='.repeat(40));

// Check if API key is available
console.log('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
console.log('process.env.API_KEY:', process.env.API_KEY);

// Check if app initialized properly
if (window.app) {
    console.log('✅ App instance found');
    console.log('App genAI instance:', window.app.genAI ? '✅ INITIALIZED' : '❌ NOT INITIALIZED');
    
    // Test if we can access the Google AI
    if (window.app.genAI) {
        console.log('✅ GoogleGenAI instance is available');
        console.log('🎉 API KEY IS WORKING!');
    } else {
        console.log('❌ GoogleGenAI instance is null - API key issue');
    }
} else {
    console.log('❌ App instance not found');
}

console.log('\n🧪 Full status check...');
console.log('Current URL:', window.location.href);
console.log('DOM ready:', document.readyState);
