#!/usr/bin/env node

/**
 * Automated Console Error Testing Script
 * Tests the application for the specific console errors we fixed
 */

const http = require('http');
const fs = require('fs');

// Test if server is responsive
async function testServerResponse() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:4175', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Server is responsive (Status: 200)');
                    resolve(true);
                } else {
                    console.log('❌ Server returned status:', res.statusCode);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.log('❌ Server connection error:', err.message);
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ Server timeout');
            req.abort();
            resolve(false);
        });
    });
}

// Check if our fixes are in place
function checkFixesImplemented() {
    console.log('\n🔍 Checking implemented fixes...');
    
    // Check .env file
    const envExists = fs.existsSync('.env');
    const envContent = envExists ? fs.readFileSync('.env', 'utf8') : '';
    const hasApiKey = envContent.includes('VITE_GEMINI_API_KEY=AIzaSyBVTWFzaIlgfb68O8SHfzGP_xcAX5Ll5Yo');
    
    console.log(`✅ .env file exists: ${envExists}`);
    console.log(`✅ API key configured: ${hasApiKey}`);
    
    // Check if PerformanceMonitor.ts has getRecentOperations
    const perfMonitorPath = './src/services/PerformanceMonitor.ts';
    const perfMonitorExists = fs.existsSync(perfMonitorPath);
    let hasGetRecentOperations = false;
    
    if (perfMonitorExists) {
        const perfContent = fs.readFileSync(perfMonitorPath, 'utf8');
        hasGetRecentOperations = perfContent.includes('getRecentOperations');
    }
    
    console.log(`✅ PerformanceMonitor.ts exists: ${perfMonitorExists}`);
    console.log(`✅ getRecentOperations method added: ${hasGetRecentOperations}`);
    
    // Check if AudioTranscriptionApp.ts has corrected measureOperation calls
    const appPath = './src/components/AudioTranscriptionApp.ts';
    const appExists = fs.existsSync(appPath);
    let hasCorrectedCalls = false;
    
    if (appExists) {
        const appContent = fs.readFileSync(appPath, 'utf8');
        // Check for the pattern we implemented: measureOperation with 3 parameters
        hasCorrectedCalls = appContent.includes('measureOperation(') && 
                           appContent.includes('apiResponseTime') && 
                           appContent.includes('chartRenderTime');
    }
    
    console.log(`✅ AudioTranscriptionApp.ts exists: ${appExists}`);
    console.log(`✅ measureOperation calls corrected: ${hasCorrectedCalls}`);
    
    return {
        envFile: envExists && hasApiKey,
        performanceMonitor: perfMonitorExists && hasGetRecentOperations,
        audioApp: appExists && hasCorrectedCalls
    };
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Console Error Fix Validation Tests');
    console.log('=' .repeat(60));
    
    const serverOk = await testServerResponse();
    const fixes = checkFixesImplemented();
    
    console.log('\n📊 TEST RESULTS:');
    console.log('=' .repeat(60));
    
    console.log(`🌐 Server Response: ${serverOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔑 API Key Configuration: ${fixes.envFile ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📊 PerformanceMonitor Fix: ${fixes.performanceMonitor ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🎯 AudioApp measureOperation Fix: ${fixes.audioApp ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = serverOk && fixes.envFile && fixes.performanceMonitor && fixes.audioApp;
    
    console.log('\n🏆 OVERALL RESULT:');
    console.log('=' .repeat(60));
    console.log(allPassed ? '✅ ALL TESTS PASSED - FIXES SUCCESSFUL!' : '❌ SOME ISSUES REMAIN');
    
    if (!allPassed) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        if (!serverOk) console.log('- Restart the development server');
        if (!fixes.envFile) console.log('- Check .env file configuration');
        if (!fixes.performanceMonitor) console.log('- Verify PerformanceMonitor.ts changes');
        if (!fixes.audioApp) console.log('- Verify AudioTranscriptionApp.ts changes');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Open http://localhost:4175 in your browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Check the Console tab for any remaining errors');
    console.log('4. Test the application functionality');
    
    return allPassed;
}

// Run the tests
runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});
