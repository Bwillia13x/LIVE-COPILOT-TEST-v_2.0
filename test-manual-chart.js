// Quick test to verify manual chart generation works
console.log('🧪 Testing manual chart functionality...');

// Wait for page to load
setTimeout(() => {
  if (window.app && typeof window.app.testChartGeneration === 'function') {
    console.log('✅ window.app.testChartGeneration is available');
    console.log('🔗 Manual chart test can be run via:');
    console.log('   - Red chart button in UI');
    console.log('   - window.app.testChartGeneration() in console');
  } else {
    console.error('❌ window.app.testChartGeneration not available');
  }
  
  // Check if auto-testing messages appear
  let autoTestDetected = false;
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Testing Priority 3 features') || 
        message.includes('Testing cross-feature integration') ||
        message.includes('Testing Priority 4 features')) {
      console.error('❌ Auto-test detected:', message);
      autoTestDetected = true;
    }
    return originalLog.apply(console, args);
  };
  
  // Check after 5 seconds
  setTimeout(() => {
    if (!autoTestDetected) {
      console.log('✅ No auto-testing detected - fix successful!');
    }
  }, 5000);
}, 2000);
