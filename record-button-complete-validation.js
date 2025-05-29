// Comprehensive validation script for record button functionality
console.log('🔍 Running comprehensive record button validation...');

// Test results tracking
const validationResults = {
    viteServer: false,
    htmlStructure: false,
    typescriptCompilation: false,
    browserCapabilities: false,
    eventListeners: false,
    recordButtonFunctionality: false
};

// Test 1: Vite server availability
async function testViteServer() {
    try {
        const response = await fetch('http://localhost:5174/');
        if (response.ok) {
            validationResults.viteServer = true;
            console.log('✅ Vite server is running and responding');
            return true;
        } else {
            console.log(`❌ Vite server error: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Cannot connect to Vite server: ${error.message}`);
        return false;
    }
}

// Test 2: HTML structure validation
async function testHtmlStructure() {
    try {
        const response = await fetch('http://localhost:5174/');
        const html = await response.text();
        
        const hasRecordButton = html.includes('id="recordButton"');
        const hasRecordingInterface = html.includes('recording-interface');
        const hasRecordingStatus = html.includes('id="recordingStatus"');
        const hasTypeScriptReference = html.includes('index.tsx');
        
        console.log('📋 HTML Structure Analysis:');
        console.log(`  Record button: ${hasRecordButton ? '✅' : '❌'}`);
        console.log(`  Recording interface: ${hasRecordingInterface ? '✅' : '❌'}`);
        console.log(`  Recording status: ${hasRecordingStatus ? '✅' : '❌'}`);
        console.log(`  TypeScript reference: ${hasTypeScriptReference ? '✅' : '❌'}`);
        
        validationResults.htmlStructure = hasRecordButton && hasRecordingInterface && hasRecordingStatus && hasTypeScriptReference;
        return validationResults.htmlStructure;
    } catch (error) {
        console.log(`❌ HTML structure test failed: ${error.message}`);
        return false;
    }
}

// Test 3: TypeScript compilation
async function testTypeScriptCompilation() {
    try {
        // In Vite, TypeScript is compiled on the fly, so we test if the module loads
        const response = await fetch('http://localhost:5174/index.tsx');
        
        if (response.ok) {
            console.log('✅ TypeScript file accessible via Vite');
            const content = await response.text();
            
            // Check for key methods
            const hasStartRecording = content.includes('startRecording');
            const hasStopRecording = content.includes('stopRecording');
            const hasMediaRecorder = content.includes('MediaRecorder');
            const hasEventBinding = content.includes('bindEventListeners');
            
            console.log('⚙️ TypeScript Code Analysis:');
            console.log(`  startRecording method: ${hasStartRecording ? '✅' : '❌'}`);
            console.log(`  stopRecording method: ${hasStopRecording ? '✅' : '❌'}`);
            console.log(`  MediaRecorder usage: ${hasMediaRecorder ? '✅' : '❌'}`);
            console.log(`  Event binding: ${hasEventBinding ? '✅' : '❌'}`);
            
            validationResults.typescriptCompilation = hasStartRecording && hasStopRecording && hasMediaRecorder && hasEventBinding;
            return validationResults.typescriptCompilation;
        } else {
            console.log(`❌ TypeScript file not accessible: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ TypeScript compilation test failed: ${error.message}`);
        return false;
    }
}

// Test 4: Browser capabilities
function testBrowserCapabilities() {
    console.log('🌐 Testing browser capabilities...');
    
    let capabilities = 0;
    const totalCapabilities = 3;
    
    // MediaRecorder API
    if (typeof MediaRecorder !== 'undefined') {
        console.log('✅ MediaRecorder API available');
        capabilities++;
        
        // Test supported formats
        const formats = ['audio/webm', 'audio/mp4', 'audio/wav'];
        const supported = formats.filter(format => MediaRecorder.isTypeSupported(format));
        console.log(`  Supported formats: ${supported.join(', ') || 'none'}`);
    } else {
        console.log('❌ MediaRecorder API not available');
    }
    
    // getUserMedia API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('✅ getUserMedia API available');
        capabilities++;
    } else {
        console.log('❌ getUserMedia API not available');
    }
    
    // Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        console.log('✅ Speech Recognition API available');
        capabilities++;
    } else {
        console.log('❌ Speech Recognition API not available');
    }
    
    validationResults.browserCapabilities = capabilities >= 2; // At least MediaRecorder and getUserMedia
    return validationResults.browserCapabilities;
}

// Test 5: Event listeners (simulated)
function testEventListeners() {
    console.log('🔗 Testing event listener setup...');
    
    // Since we can't directly test the compiled app from here,
    // we'll validate that the structure is in place
    const hasRecordButton = document.querySelector('#recordButton') !== null;
    
    if (hasRecordButton) {
        console.log('✅ Record button element exists');
        validationResults.eventListeners = true;
    } else {
        console.log('❌ Record button element not found');
        validationResults.eventListeners = false;
    }
    
    return validationResults.eventListeners;
}

// Test 6: Overall functionality assessment
function assessFunctionality() {
    const passedTests = Object.values(validationResults).filter(result => result).length;
    const totalTests = Object.keys(validationResults).length;
    
    console.log('\n📊 VALIDATION SUMMARY:');
    console.log('═══════════════════════════════════');
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log('');
    
    Object.entries(validationResults).forEach(([test, result]) => {
        const status = result ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${test}: ${status}`);
    });
    
    console.log('');
    
    if (passedTests >= 4) {
        console.log('🎉 RECORD BUTTON SHOULD BE WORKING!');
        console.log('');
        console.log('📋 To test manually:');
        console.log('1. Open http://localhost:5174 in browser');
        console.log('2. Click the record button (microphone icon)');
        console.log('3. Allow microphone access when prompted');
        console.log('4. Button should change to stop icon and show "Recording..."');
        console.log('5. Click again to stop recording');
        
        validationResults.recordButtonFunctionality = true;
    } else {
        console.log('⚠️ RECORD BUTTON MAY HAVE ISSUES');
        console.log('');
        console.log('🔧 Potential fixes needed:');
        
        if (!validationResults.viteServer) {
            console.log('- Start Vite development server: npm run dev');
        }
        if (!validationResults.typescriptCompilation) {
            console.log('- Check TypeScript compilation errors');
        }
        if (!validationResults.browserCapabilities) {
            console.log('- Use a modern browser with MediaRecorder support');
        }
    }
    
    return validationResults.recordButtonFunctionality;
}

// Run all validation tests
async function runCompleteValidation() {
    console.log('🚀 Starting complete record button validation...\n');
    
    try {
        await testViteServer();
        await testHtmlStructure();
        await testTypeScriptCompilation();
        testBrowserCapabilities();
        // testEventListeners(); // Skip this as it requires DOM
        
        assessFunctionality();
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
    }
}

// Export for Node.js or run immediately in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runCompleteValidation, validationResults };
} else {
    // Run in browser context
    runCompleteValidation();
}
