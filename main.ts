/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioTranscriptionApp } from './src/components/AudioTranscriptionApp.js';
import { ErrorHandler } from './src/utils.js';

// Global app instance for external access
let app: AudioTranscriptionApp;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new AudioTranscriptionApp();
    
    // Make app globally accessible for external access (e.g., from HTML onclick handlers)
    (window as any).app = app;
    (window as any).audioApp = app; // Also expose as audioApp for validation scripts
    
    // eslint-disable-next-line no-console
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
