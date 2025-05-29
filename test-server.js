// Simple test to verify the app is working
// Run this in Node.js to test the HTTP server response

import http from 'http';

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4173,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Voice Notes App Server...\n');

  try {
    // Test main page
    console.log('📄 Testing main page...');
    const mainPage = await testEndpoint('/');
    console.log(`✅ Main page: ${mainPage.statusCode} (${mainPage.data.length} bytes)`);
    
    // Check if critical elements are present
    const hasRecordButton = mainPage.data.includes('recordButton') || mainPage.data.includes('recordBtn');
    const hasVoiceNotesApp = mainPage.data.includes('VoiceNotesApp') || mainPage.data.includes('window.app');
    const hasDOMContentLoaded = mainPage.data.includes('DOMContentLoaded');
    
    console.log(`   📱 Record button reference: ${hasRecordButton ? '✅' : '❌'}`);
    console.log(`   🎯 App initialization: ${hasVoiceNotesApp ? '✅' : '❌'}`);
    console.log(`   🚀 DOM ready handler: ${hasDOMContentLoaded ? '✅' : '❌'}`);

    // Test CSS
    console.log('\n🎨 Testing CSS...');
    const cssResponse = await testEndpoint('/assets/index--h0TAIac.css');
    console.log(`✅ CSS file: ${cssResponse.statusCode} (${cssResponse.data.length} bytes)`);

    // Test JS
    console.log('\n📦 Testing JavaScript...');
    const jsResponse = await testEndpoint('/assets/index-BJt3teX8.js');
    console.log(`✅ JS file: ${jsResponse.statusCode} (${jsResponse.data.length} bytes)`);
    
    // Check if JS contains our app
    const jsHasApp = jsResponse.data.includes('window.app') || jsResponse.data.includes('VoiceNotesApp');
    console.log(`   🎯 App in JS bundle: ${jsHasApp ? '✅' : '❌'}`);

    // Test test page
    console.log('\n🧪 Testing test page...');
    try {
      const testPage = await testEndpoint('/test-page.html');
      console.log(`✅ Test page: ${testPage.statusCode} (${testPage.data.length} bytes)`);
    } catch (error) {
      console.log(`❌ Test page: ${error.message}`);
    }

    console.log('\n🏁 Server tests completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Open http://localhost:4173/ in browser');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Check if window.app is available');
    console.log('   4. Try clicking the record button');
    console.log('   5. Check for any console errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
