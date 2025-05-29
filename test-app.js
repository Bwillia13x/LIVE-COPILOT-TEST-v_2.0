/**
 * Test script to verify app functionality
 * Open browser console and run: loadScript('./test-app.js').then(() => testApp())
 */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function testApp() {
  console.log('🧪 Testing VoiceNotesApp...');
  
  // Check if app instance exists
  if (!window.app) {
    console.error('❌ window.app not found');
    return false;
  }
  
  console.log('✅ window.app found:', typeof window.app);
  
  // Check if app has required methods
  const requiredMethods = [
    'initializeErrorHandling',
    'handleError',
    'showToast',
    'setupMediaRecorder',
    'startRecording',
    'stopRecording'
  ];
  
  const missingMethods = requiredMethods.filter(method => typeof window.app[method] !== 'function');
  
  if (missingMethods.length > 0) {
    console.error('❌ Missing methods:', missingMethods);
    return false;
  }
  
  console.log('✅ All required methods present');
  
  // Check if record button exists and is functional
  const recordButton = document.getElementById('recordButton');
  if (!recordButton) {
    console.error('❌ Record button not found');
    console.log('🔍 Available button elements:');
    document.querySelectorAll('button').forEach((btn, i) => {
      console.log(`   ${i}: ID="${btn.id}" class="${btn.className}"`);
    });
    return false;
  }
  
  console.log('✅ Record button found');
  console.log('   - Disabled:', recordButton.disabled);
  console.log('   - Class:', recordButton.className);
  
  // Test if we can access navigator.mediaDevices
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('⚠️  MediaDevices API not available (may be due to HTTP/localhost)');
  } else {
    console.log('✅ MediaDevices API available');
  }
  
  // Test error handling
  try {
    window.app.showToast('Test toast message', 'info');
    console.log('✅ showToast method working');
  } catch (error) {
    console.error('❌ showToast failed:', error);
  }
  
  console.log('\n🎉 App test completed successfully!');
  return true;
}

// Auto-run test when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testApp, 100); // Small delay to ensure app is initialized
  });
} else {
  setTimeout(testApp, 100);
}
