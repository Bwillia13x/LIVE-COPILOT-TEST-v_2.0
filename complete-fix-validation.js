// Complete Fix Validation Test
// Run this in the browser console at http://localhost:5173

console.log("🔧 COMPLETE FIX VALIDATION TEST");
console.log("==================================");

// Test 1: Check Vite environment variables
console.log("\n1. Testing Vite Environment Variables:");
if (import.meta && import.meta.env) {
    console.log("✓ import.meta.env is available");
    
    if (import.meta.env.VITE_GEMINI_API_KEY) {
        console.log("✓ VITE_GEMINI_API_KEY found:", import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10) + "...");
        console.log("  - Key length:", import.meta.env.VITE_GEMINI_API_KEY.length, "characters");
    } else {
        console.log("✗ VITE_GEMINI_API_KEY not found");
    }
    
    // List all VITE_ prefixed variables
    const viteVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
    console.log("  - Available VITE_ variables:", viteVars);
} else {
    console.log("✗ import.meta.env not available");
}

// Test 2: Test GoogleGenAI initialization with new variable
console.log("\n2. Testing GoogleGenAI Initialization:");
try {
    // Import GoogleGenAI (this will work if the importmap is loaded)
    const { GoogleGenAI } = await import('@google/genai');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDE1gzCeTw42daw84Y-Lh_P7XurdLCZHoI';
    console.log("✓ Using API key:", apiKey.substring(0, 10) + "...");
    
    const genAI = new GoogleGenAI(apiKey);
    console.log("✓ GoogleGenAI instance created successfully");
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("✓ Model instance created successfully");
    
} catch (error) {
    console.log("✗ GoogleGenAI initialization failed:", error.message);
}

// Test 3: Check if app is properly initialized
console.log("\n3. Testing App Initialization:");
if (window.app) {
    console.log("✓ window.app is available");
    
    if (window.app.genAI) {
        console.log("✓ App has AI service initialized");
    } else {
        console.log("⚠️ App AI service not initialized");
    }
} else {
    console.log("⚠️ window.app not yet available (may still be loading)");
}

// Test 4: Record button verification
console.log("\n4. Testing Record Button:");
const recordButton = document.getElementById('recordButton');
if (recordButton) {
    console.log("✓ Record button found");
    console.log("  - Element:", recordButton.tagName);
    console.log("  - Classes:", recordButton.className);
    console.log("  - Visible:", recordButton.offsetParent !== null);
} else {
    console.log("✗ Record button not found");
}

console.log("\n🎯 FIX VALIDATION COMPLETE");
console.log("If all tests show ✓, the fix was successful!");
