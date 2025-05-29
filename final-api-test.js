// Final API Key Test - Run this in browser console
console.log("=== FINAL API KEY TEST ===");

// Test 1: Check if process.env is defined
console.log("1. process.env available:", typeof process !== 'undefined' && process.env);

// Test 2: Check specific API key access
if (typeof process !== 'undefined' && process.env) {
    console.log("2. GEMINI_API_KEY value:", process.env.GEMINI_API_KEY);
    console.log("3. API_KEY value:", process.env.API_KEY);
} else {
    console.log("2. process.env not available in browser");
}

// Test 3: Check if record button exists
const recordButton = document.getElementById('recordButton');
console.log("4. Record button found:", !!recordButton);
if (recordButton) {
    console.log("   - Button element:", recordButton);
    console.log("   - Button classes:", recordButton.className);
    console.log("   - Button visible:", recordButton.offsetParent !== null);
}

// Test 4: Try to create GoogleGenAI instance
try {
    // This will use the same logic as the main app
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDE1gzCeTw42daw84Y-Lh_P7XurdLCZHoI';
    console.log("5. API Key for GenAI:", apiKey ? "✓ Available" : "✗ Missing");
    console.log("   - Key length:", apiKey ? apiKey.length : 0);
    console.log("   - Key starts with:", apiKey ? apiKey.substring(0, 10) + "..." : "N/A");
} catch (error) {
    console.log("5. Error testing API key:", error.message);
}

console.log("=== TEST COMPLETE ===");
