// Quick test script to validate record button functionality
// Run this in the browser console of http://localhost:5173/

console.log('🧪 Testing record button functionality...');

// Check if the main app is loaded
if (window.app) {
    console.log('✅ Main app found:', window.app);
    
    // Check if record button exists
    const recordButton = document.getElementById('recordButton');
    if (recordButton) {
        console.log('✅ Record button found:', recordButton);
        console.log('🔍 Record button classes:', recordButton.className);
        
        // Test button click simulation
        console.log('🧪 Simulating record button click...');
        recordButton.click();
        
        setTimeout(() => {
            console.log('🧪 Current recording state:', window.app.isRecording);
            console.log('🧪 Record button classes after click:', recordButton.className);
            
            // If recording started, stop it after 2 seconds
            if (recordButton.classList.contains('recording')) {
                console.log('✅ Recording appears to have started! Stopping in 2 seconds...');
                setTimeout(() => {
                    recordButton.click();
                    console.log('✅ Recording stopped.');
                }, 2000);
            } else {
                console.log('❌ Recording did not start. Check for errors.');
            }
        }, 1000);
        
    } else {
        console.error('❌ Record button not found!');
    }
} else {
    console.error('❌ Main app not found. Check initialization.');
}
