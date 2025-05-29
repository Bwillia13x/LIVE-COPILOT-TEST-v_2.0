// Debug script to check recording functionality
console.log('=== Recording Debug Started ===');

// Check browser support
console.log('Speech Recognition Support:', {
  webkitSpeechRecognition: typeof webkitSpeechRecognition !== 'undefined',
  SpeechRecognition: typeof SpeechRecognition !== 'undefined',
  navigator_mediaDevices: !!navigator.mediaDevices,
  getUserMedia: !!navigator.mediaDevices?.getUserMedia
});

// Check if record button exists and has event listeners
document.addEventListener('DOMContentLoaded', () => {
  const recordButton = document.getElementById('recordButton');
  console.log('Record Button Found:', !!recordButton);
  
  if (recordButton) {
    console.log('Record Button HTML:', recordButton.outerHTML);
    
    // Test click manually
    recordButton.addEventListener('click', (e) => {
      console.log('Manual click listener triggered!', e);
    });
    
    // Check if button is disabled
    console.log('Record Button Disabled:', recordButton.disabled);
    console.log('Record Button Classes:', recordButton.className);
  }
  
  // Check microphone permissions
  navigator.permissions?.query({name: 'microphone'}).then(permission => {
    console.log('Microphone Permission:', permission.state);
  }).catch(err => {
    console.log('Permission check failed:', err);
  });
  
  // Test getUserMedia directly
  navigator.mediaDevices?.getUserMedia({audio: true}).then(stream => {
    console.log('Microphone access successful');
    stream.getTracks().forEach(track => track.stop());
  }).catch(err => {
    console.log('Microphone access failed:', err);
  });
});

// Listen for any app instance creation
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.voiceApp) {
      console.log('VoiceApp instance found:', typeof window.voiceApp);
      
      // Check if the app is properly initialized
      const app = window.voiceApp;
      console.log('App state:', {
        isRecording: app.isRecording,
        speechRecognition: !!app.speechRecognition,
        recordButton: !!app.recordButton
      });
    } else {
      console.log('VoiceApp instance not found on window');
    }
  }, 1000);
});
