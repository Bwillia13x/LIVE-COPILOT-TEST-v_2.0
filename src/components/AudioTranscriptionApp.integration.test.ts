import { AudioTranscriptionApp } from './AudioTranscriptionApp';
import { AudioRecorder, RecordingState } from '../services/AudioRecorder';
import { APIService } from '../services/APIService';
import { screen, fireEvent, waitFor } from '@testing-library/dom';

// Mock AudioRecorder
jest.mock('../services/AudioRecorder');
const MockAudioRecorder = AudioRecorder as jest.MockedClass<typeof AudioRecorder>;

let mockIsRecording = false;
let mockIsPaused = false;
let mockDuration = 0;
let onRecordingStateChangeCallback: (state: RecordingState) => void = () => {};
let onTranscriptAvailableCallback: (transcript: string) => void = () => {};

MockAudioRecorder.prototype.isSupported = jest.fn().mockReturnValue(true);
MockAudioRecorder.prototype.getIsRecording = jest.fn(() => mockIsRecording);
MockAudioRecorder.prototype.startRecording = jest.fn(async () => {
  mockIsRecording = true;
  mockIsPaused = false;
  mockDuration = 0;
  if (onRecordingStateChangeCallback) {
    onRecordingStateChangeCallback({ isRecording: mockIsRecording, isPaused: mockIsPaused, duration: mockDuration });
  }
  return true;
});
MockAudioRecorder.prototype.stopRecording = jest.fn(async () => {
  const rawTranscript = 'raw transcript';
  mockIsRecording = false;
  if (onRecordingStateChangeCallback) {
    onRecordingStateChangeCallback({ isRecording: mockIsRecording, isPaused: mockIsPaused, duration: mockDuration });
  }
  if (onTranscriptAvailableCallback) {
    onTranscriptAvailableCallback(rawTranscript);
  }
  return rawTranscript; // Or void, depending on how app uses it. App uses onTranscriptAvailable.
});
MockAudioRecorder.prototype.onRecordingStateChange = jest.fn((callback) => {
  onRecordingStateChangeCallback = callback;
});
MockAudioRecorder.prototype.onTranscriptAvailable = jest.fn((callback) => {
  onTranscriptAvailableCallback = callback;
});
MockAudioRecorder.prototype.formatDuration = jest.fn((duration: number) => {
  return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
});
MockAudioRecorder.prototype.cleanup = jest.fn();


// Mock APIService
jest.mock('../services/APIService');
const MockAPIService = APIService as jest.MockedClass<typeof APIService>;
MockAPIService.prototype.polishTranscription = jest.fn().mockResolvedValue('polished transcript');
MockAPIService.prototype.hasValidApiKey = jest.fn().mockReturnValue(true); // Assume API key is valid

describe('AudioTranscriptionApp Integration Test', () => {
  let app: AudioTranscriptionApp;
  let container: HTMLElement;

  beforeEach(() => {
    // Reset mocks for each test
    MockAudioRecorder.mockClear(); // This is fine as AudioRecorder is fully mocked via jest.mock
    // MockAPIService is now a manual mock (a real class).
    // We clear the jest.fn instances that were assigned to its methods.
    if (jest.isMockFunction(MockAPIService.prototype.polishTranscription)) {
      MockAPIService.prototype.polishTranscription.mockClear();
    }
    if (jest.isMockFunction(MockAPIService.prototype.hasValidApiKey)) {
      MockAPIService.prototype.hasValidApiKey.mockClear();
    }

    // Restore default mock implementations for AudioRecorder
    mockIsRecording = false;
    mockIsPaused = false;
    mockDuration = 0;
    onRecordingStateChangeCallback = () => {};
    onTranscriptAvailableCallback = () => {};

    MockAudioRecorder.prototype.isSupported = jest.fn().mockReturnValue(true);
    MockAudioRecorder.prototype.getIsRecording = jest.fn(() => mockIsRecording);
    MockAudioRecorder.prototype.startRecording = jest.fn(async () => {
      mockIsRecording = true;
      mockIsPaused = false;
      mockDuration = 0;
      // Important: Simulate the callback being fired
      if (onRecordingStateChangeCallback) {
        onRecordingStateChangeCallback({ isRecording: mockIsRecording, isPaused: mockIsPaused, duration: mockDuration });
      }
      return true;
    });
    MockAudioRecorder.prototype.stopRecording = jest.fn(async () => {
      const rawTranscript = 'raw transcript from stop';
      const previousRecordingState = mockIsRecording;
      mockIsRecording = false;
      // Important: Simulate the callback being fired due to stopping
      if (onRecordingStateChangeCallback && previousRecordingState) { // Only if it was recording
        onRecordingStateChangeCallback({ isRecording: mockIsRecording, isPaused: mockIsPaused, duration: mockDuration });
      }
      // Simulate transcript becoming available after stopping
      if (onTranscriptAvailableCallback && previousRecordingState) {
        onTranscriptAvailableCallback(rawTranscript);
      }
      return rawTranscript;
    });
     MockAudioRecorder.prototype.onRecordingStateChange = jest.fn((callback) => {
      onRecordingStateChangeCallback = callback;
    });
    MockAudioRecorder.prototype.onTranscriptAvailable = jest.fn((callback) => {
      onTranscriptAvailableCallback = callback;
    });
    MockAudioRecorder.prototype.formatDuration = jest.fn((duration: number) => `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);
    MockAudioRecorder.prototype.cleanup = jest.fn();


    MockAPIService.prototype.polishTranscription = jest.fn().mockResolvedValue({ success: true, data: 'polished transcript from test mock' });
    MockAPIService.prototype.hasValidApiKey = jest.fn().mockReturnValue(true); // Ensure this is also reset if tests change it

    container = document.createElement('div');
    document.body.appendChild(container);
    app = new AudioTranscriptionApp(container);
    app.init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  test('should handle recording and polishing flow correctly', async () => {
    const recordButton = screen.getByRole('button', { name: /Start Recording/i });
    const statusElement = screen.getByText(/Status: Idle/i); // Initial status
    const transcriptElement = screen.getByRole('textbox', { name: /raw transcription/i }) as HTMLTextAreaElement;

    // 1. Simulate user clicking the record button
    fireEvent.click(recordButton);

    // 2. Verify that the AudioRecorder is started
    // startRecording is async, so wait for its effects
    await waitFor(() => expect(MockAudioRecorder.prototype.startRecording).toHaveBeenCalledTimes(1));

    // UI should update based on onRecordingStateChange callback
    await waitFor(() => expect(statusElement.textContent).toMatch(/Status: Recording... \(0:00\)/i));
    await waitFor(() => expect(recordButton.textContent).toBe('Stop Recording'));

    // 3. Simulate user clicking the stop recording button
    fireEvent.click(recordButton);

    // stopRecording is async
    await waitFor(() => expect(MockAudioRecorder.prototype.stopRecording).toHaveBeenCalledTimes(1));

    // After stopRecording, onRecordingStateChange (isRecording=false) and then onTranscriptAvailable are called by the mock.
    // The app should then display raw transcript and change status to Processing...

    await waitFor(() => expect(transcriptElement.value).toBe('raw transcript from stop'));
    await waitFor(() => expect(statusElement.textContent).toBe('Status: Processing...'));

    // 4. Verify APIService providing a polished transcript
    // polishCurrentTranscription is called, which calls APIService.polishTranscript
    await waitFor(() => expect(MockAPIService.prototype.polishTranscription).toHaveBeenCalledWith('raw transcript from stop'));

    // 5. Verify that the UI displays the polished transcript and final status
    // await waitFor(() => expect(screen.getByDisplayValue('polished transcript')).toBeInTheDocument()); // Check textarea content
    // For textareas, getByDisplayValue might be flaky or not update as expected by testing-library immediately.
    // It's often more reliable to check the .value property directly after other awaiters.
    const polishedNoteElement = screen.getByTestId('polished-note-area'); // Assuming you add data-testid="polished-note-area" to the polishedNoteArea div
    await waitFor(() => expect(polishedNoteElement.textContent).toBe('polished transcript from test mock'));

    await waitFor(() => expect(statusElement.textContent).toBe('Status: Polished'));
    await waitFor(() => expect(recordButton.textContent).toBe('Start Recording')); // Button resets
  });
});
