// Debug script to test transcription to chart generation flow
console.log('🔍 Debugging transcription to chart generation flow...');

// Wait for app to be available
setTimeout(() => {
  if (typeof window !== 'undefined' && window.app) {
    console.log('✅ App found, testing transcription flow...');
    
    // 1. Test if AI is available
    console.log('🧠 Testing AI availability...');
    console.log('genAI available:', !!window.app.genAI);
    
    // 2. Simulate some transcription content
    console.log('📝 Simulating transcription with numerical data...');
    const testTranscript = "Our quarterly sales were quite impressive. In Q1 we made 120 thousand dollars, Q2 brought in 190 thousand, Q3 was 300 thousand, and Q4 reached 500 thousand dollars. This shows a clear upward trend.";
    
    // 3. Set the transcript manually
    window.app.finalTranscript = testTranscript;
    
    // 4. Update the raw transcription display
    if (window.app.rawTranscription) {
      window.app.rawTranscription.textContent = testTranscript;
      console.log('📝 Updated raw transcription display');
    }
    
    // 5. Test processNewTranscription manually
    console.log('🔄 Calling processNewTranscription...');
    window.app.processNewTranscription(testTranscript);
    
    // 6. Wait a bit and check if polished note gets updated
    setTimeout(() => {
      console.log('🔍 Checking if polished note was updated...');
      const polishedContent = window.app.polishedNote?.innerHTML || '';
      console.log('Polished note content length:', polishedContent.length);
      console.log('Polished note content preview:', polishedContent.substring(0, 100) + '...');
      
      // 7. Check if any charts were generated
      console.log('📊 Checking for generated charts...');
      const chartArea = window.app.aiChartDisplayArea;
      if (chartArea) {
        console.log('Chart area children count:', chartArea.children.length);
        console.log('Chart area innerHTML length:', chartArea.innerHTML.length);
        if (chartArea.innerHTML.length > 0) {
          console.log('Chart area content preview:', chartArea.innerHTML.substring(0, 200) + '...');
        }
      }
      
      // 8. Check active chart instances
      console.log('Active chart instances:', window.app.activeAiChartInstances?.length || 0);
      
    }, 3000); // Wait 3 seconds for AI processing
    
  } else {
    console.log('❌ App not available yet, retrying...');
    setTimeout(() => {
      // Retry the whole check
      if (window.app && window.app.testChartGeneration) {
        console.log('✅ App found on retry, testing chart generation...');
        window.app.testChartGeneration().then(() => {
          console.log('✅ Chart generation test completed on retry');
        }).catch(error => {
          console.error('❌ Chart generation test failed on retry:', error);
        });
      } else {
        console.log('❌ App still not available after retry');
      }
    }, 1000); // Retry after 1 second
  }
}, 2000); // Initial wait for page load
