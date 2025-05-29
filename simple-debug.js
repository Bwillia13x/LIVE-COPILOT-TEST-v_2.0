// Simplified test to identify the exact issue with chart generation
console.log('🔍 SIMPLIFIED CHART GENERATION DEBUG');

// Wait for the app to load
function testChartGeneration() {
  setTimeout(() => {
    if (window.app) {
      console.log('✅ App loaded successfully');
      
      // Check AI availability
      console.log('🧠 AI (genAI) available:', !!window.app.genAI);
      console.log('📊 Chart display area available:', !!window.app.aiChartDisplayArea);
      
      // Test 1: Manual chart generation
      console.log('\n📊 TEST 1: Manual chart generation');
      window.app.testChartGeneration();
      
      // Test 2: Check if processNewTranscription calls updatePolishedNote
      console.log('\n📝 TEST 2: Testing processNewTranscription flow');
      
      // Set up a test transcript
      const testText = "Sales data: Q1 was 100k, Q2 was 150k, Q3 was 200k, Q4 was 250k";
      window.app.finalTranscript = testText;
      
      // Add console logging to track the flow
      const originalUpdatePolishedNote = window.app.updatePolishedNote;
      window.app.updatePolishedNote = async function() {
        console.log('🧠 updatePolishedNote() called!');
        console.log('🧠 genAI available:', !!this.genAI);
        return originalUpdatePolishedNote.call(this);
      };
      
      // Call processNewTranscription
      console.log('🔄 Calling processNewTranscription...');
      window.app.processNewTranscription(testText);
      
      // Wait and check results
      setTimeout(() => {
        console.log('\n📋 RESULTS:');
        console.log('Polished note content length:', window.app.polishedNote?.innerHTML?.length || 0);
        console.log('Chart area children count:', window.app.aiChartDisplayArea?.children?.length || 0);
        console.log('Active chart instances:', window.app.activeAiChartInstances?.length || 0);
      }, 5000);
      
    } else {
      console.log('❌ App not available, retrying...');
      setTimeout(testChartGeneration, 1000);
    }
  }, 2000);
}

testChartGeneration();
