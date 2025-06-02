/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeEnvironment } from './src/config/environment.js';
import { AudioTranscriptionApp } from './src/components/AudioTranscriptionApp.js';
import { ErrorHandler } from './src/utils.js';

// Attempt to initialize environment variables first
try {
  initializeEnvironment();
  console.log('🌍 Environment initialized successfully.');
} catch (error) {
  ErrorHandler.logError('Critical: Failed to initialize environment', error as Error);
  // Optionally, display a user-facing message if the app cannot run without environment setup
  // For now, we just log it. The app initialization later might fail more gracefully or show a message.
  console.error('Critical: Environment initialization failed. Application may not function correctly.', error);
  // You might want to prevent further app execution here if the error is catastrophic
  // For example, by throwing a new error or setting a global failure flag.
}

// Global app instance for external access
let app: AudioTranscriptionApp;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new AudioTranscriptionApp();
    
    // Make app globally accessible for external access (e.g., from HTML onclick handlers)
    (window as any).app = app;
    (window as any).audioApp = app; // Also expose as audioApp for validation scripts
    
    console.log('🎙️ Audio Transcription App loaded successfully');
  } catch (error) {
    ErrorHandler.logError('Failed to initialize application', error);
    
    // Show fallback error message
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #d32f2f;">
        <h1>Application Error</h1>
        <p>Failed to initialize the Audio Transcription App.</p>
        <p>Please refresh the page and try again.</p>
        <button onclick="location.reload()">Refresh Page</button>
      </div>
    `;
  }
});

// Handle any unhandled errors
window.addEventListener('error', (event) => {
  ErrorHandler.logError('Unhandled error', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.logError('Unhandled promise rejection', event.reason);
});

// Export for module usage
export { app };
