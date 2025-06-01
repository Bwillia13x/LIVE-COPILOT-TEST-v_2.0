import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// AudioRecorder is dynamically imported in beforeEach
// AppConfig and ErrorHandler (from utils) will be imported after being mocked
import { AUDIO_RECORDER_CONFIG as DEFAULT_AUDIO_RECORDER_CONFIG, ERROR_MESSAGES } from '../../src/constants';
import type { RecordingState, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from '../../src/types';

// --- Mocking Section ---

vi.mock('../../src/config/AppConfig', async (importOriginal) => {
  const actualConfig = await importOriginal() as any;
  return {
    AppConfig: {
      ...actualConfig.AppConfig,
      getAudioRecorderConfig: vi.fn(() => DEFAULT_AUDIO_RECORDER_CONFIG),
    }
  };
});

vi.mock('../../src/utils', async (importOriginal) => {
  const actualUtils = await importOriginal() as any;
  return {
    ...actualUtils,
    ErrorHandler: {
      ...actualUtils.ErrorHandler,
      logError: vi.fn(),
      logWarning: vi.fn(),
    },
  };
});

const mockGetUserMedia = vi.fn();
vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
  },
});

const mockRecognitionInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onresult: null as ((event: SpeechRecognitionEvent) => void) | null,
  onerror: null as ((event: SpeechRecognitionErrorEvent) => void) | null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};
const MockSpeechRecognition = vi.fn(() => mockRecognitionInstance);
vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);

interface BlobEvent extends Event { data: Blob; }
const mockMediaRecorderInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  state: 'inactive' as 'inactive' | 'recording' | 'paused',
  mimeType: '',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};
const MockMediaRecorder = vi.fn((stream?: MediaStream, options?: MediaRecorderOptions) => {
  mockMediaRecorderInstance.mimeType = options?.mimeType || '';
  mockMediaRecorderInstance.state = 'inactive';
  mockMediaRecorderInstance.ondataavailable = null;
  mockMediaRecorderInstance.onerror = null;
  return mockMediaRecorderInstance;
});
vi.stubGlobal('MediaRecorder', MockMediaRecorder);

const mockMediaStreamTrackStop = vi.fn();
const mockMediaStreamTrack = { stop: mockMediaStreamTrackStop, kind: 'audio' };


// --- Test Suite ---
describe('AudioRecorder', () => {
  let audioRecorder: import('../../src/services/AudioRecorder').AudioRecorder;
  let AudioRecorderClass: typeof import('../../src/services/AudioRecorder').AudioRecorder;

  let mockOnTranscriptAvailable: ReturnType<typeof vi.fn>;
  let mockOnRecordingStateChange: ReturnType<typeof vi.fn>;
  // The AudioRecorder itself does not take an onError callback in constructor.
  // It uses ErrorHandler.logError.

  let referencedAppConfigGetAudioRecorderConfig: ReturnType<typeof vi.fn>;
  let referencedErrorHandlerLogError: ReturnType<typeof vi.fn>;
  let referencedErrorHandlerLogWarning: ReturnType<typeof vi.fn>;
  let mockOnRecognitionEnd: ReturnType<typeof vi.fn>;


  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const { AppConfig } = await import('../../src/config/AppConfig');
    referencedAppConfigGetAudioRecorderConfig = AppConfig.getAudioRecorderConfig as ReturnType<typeof vi.fn>;

    const utilsModule = await import('../../src/utils');
    referencedErrorHandlerLogError = utilsModule.ErrorHandler.logError as ReturnType<typeof vi.fn>;
    referencedErrorHandlerLogWarning = utilsModule.ErrorHandler.logWarning as ReturnType<typeof vi.fn>;

    referencedAppConfigGetAudioRecorderConfig.mockClear().mockReturnValue(DEFAULT_AUDIO_RECORDER_CONFIG);
    referencedErrorHandlerLogError.mockClear();
    referencedErrorHandlerLogWarning.mockClear();

    mockGetUserMedia.mockReset().mockResolvedValue({
        getTracks: vi.fn(() => [mockMediaStreamTrack]),
        getAudioTracks: vi.fn(() => [mockMediaStreamTrack]),
    } as unknown as MediaStream);
    mockMediaStreamTrackStop.mockClear();

    MockSpeechRecognition.mockClear();
    Object.assign(mockRecognitionInstance, {
        start: vi.fn(), stop: vi.fn(), abort: vi.fn(),
        continuous: false, interimResults: false, lang: '',
        onstart: null, onend: null, onresult: null, onerror: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    });

    MockMediaRecorder.mockClear();
    Object.assign(mockMediaRecorderInstance, {
        start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(),
        state: 'inactive', mimeType: '', ondataavailable: null, onerror: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    });

    mockOnTranscriptAvailable = vi.fn();
    mockOnRecordingStateChange = vi.fn();

    const { AudioRecorder: ImportedAudioRecorder } = await import('../../src/services/AudioRecorder');
    AudioRecorderClass = ImportedAudioRecorder;

    // Default instantiation for most tests, can be overridden in specific 'it' blocks if needed
    audioRecorder = new AudioRecorderClass();
    audioRecorder.onTranscriptAvailable(mockOnTranscriptAvailable);
    audioRecorder.onRecordingStateChange(mockOnRecordingStateChange);

    mockOnRecognitionEnd = vi.fn(); // Initialize here
    audioRecorder.onRecognitionEnd(mockOnRecognitionEnd); // Register the callback
  });

  afterEach(() => {
    vi.useRealTimers(); // Clean up fake timers
    vi.restoreAllMocks();
  });

  describe('Constructor and Initial State', () => {
    it('should initialize with default state when SpeechRecognition is available', () => {
      // audioRecorder is already constructed in beforeEach
      const initialState = audioRecorder.getState();
      expect(initialState.isRecording).toBe(false);
      expect(initialState.isPaused).toBe(false);
      expect(initialState.duration).toBe(0);

      expect(mockOnTranscriptAvailable).not.toHaveBeenCalled();
      expect(mockOnRecordingStateChange).not.toHaveBeenCalled();
      expect(referencedErrorHandlerLogError).not.toHaveBeenCalled();
    });

    it('should correctly apply configuration from AppConfig during construction', async () => {
      const customConfig = {
        LANG: 'fr-FR',
        MIME_TYPE: 'audio/ogg',
        TIMESLICE_INTERVAL: 2000,
        RECOGNITION_RESTART_DELAY: 200,
        DURATION_UPDATE_INTERVAL: 200
      };
      referencedAppConfigGetAudioRecorderConfig.mockReturnValue(customConfig);

      // Re-instantiate with the new config mock in place for this test's context
      audioRecorder = new AudioRecorderClass();
      audioRecorder.onTranscriptAvailable(mockOnTranscriptAvailable);
      audioRecorder.onRecordingStateChange(mockOnRecordingStateChange);

      expect(MockSpeechRecognition).toHaveBeenCalled();
      if (audioRecorder.isSupported()) {
        expect(mockRecognitionInstance.lang).toBe(customConfig.LANG);
        expect(mockRecognitionInstance.continuous).toBe(true);
        expect(mockRecognitionInstance.interimResults).toBe(true);
      }
      expect(audioRecorder).toBeInstanceOf(AudioRecorderClass);
    });

    it('should correctly reflect not supported if SpeechRecognition API is not available', async () => {
      vi.stubGlobal('SpeechRecognition', undefined);
      vi.stubGlobal('webkitSpeechRecognition', undefined);

      vi.resetModules();
      const { AppConfig: FreshAppConfig } = await import('../../src/config/AppConfig');
      (FreshAppConfig.getAudioRecorderConfig as ReturnType<typeof vi.fn>).mockReturnValue(DEFAULT_AUDIO_RECORDER_CONFIG);
      const { ErrorHandler: FreshErrorHandler } = await import('../../src/utils');
      const freshMockLogError = FreshErrorHandler.logError as ReturnType<typeof vi.fn>;
      freshMockLogError.mockClear();

      const { AudioRecorder: IsolatedAudioRecorder } = await import('../../src/services/AudioRecorder');
      const isolatedAudioRecorder = new IsolatedAudioRecorder();

      expect(isolatedAudioRecorder).toBeInstanceOf(IsolatedAudioRecorder);
      expect(isolatedAudioRecorder.isSupported()).toBe(false);
      expect(freshMockLogError).not.toHaveBeenCalledWith("SpeechRecognition API not supported.", "constructor");
    });
  });

  describe('startRecording()', () => {
    beforeEach(() => {
      // Ensure audioRecorder is a new instance for each test in this describe block
      // Callbacks are already attached in the outer beforeEach
      audioRecorder = new AudioRecorderClass();
      audioRecorder.onTranscriptAvailable(mockOnTranscriptAvailable);
      audioRecorder.onRecordingStateChange(mockOnRecordingStateChange);

      // Reset call counts for mocks specifically relevant to startRecording
      mockGetUserMedia.mockClear();
      MockSpeechRecognition.mockClear(); // To check if it's called again (it shouldn't be, initialized in constructor)
      mockRecognitionInstance.start.mockClear();
      mockRecognitionInstance.onstart = null; // Reset event handler
      MockMediaRecorder.mockClear();
      mockMediaRecorderInstance.start.mockClear();
      mockMediaRecorderInstance.state = 'inactive';
      mockOnRecordingStateChange.mockClear();
      referencedErrorHandlerLogError.mockClear();
      referencedErrorHandlerLogWarning.mockClear();
      mockRecognitionInstance.stop.mockClear(); // For stopRecording tests
      mockMediaRecorderInstance.stop.mockClear(); // For stopRecording tests
    });

    it('should request microphone permission, initialize MediaRecorder and SpeechRecognition, and start recording when permission is granted', async () => {
      // Arrange
      // mockGetUserMedia is already set up in the outer beforeEach to resolve with mockMediaStreamTrack
      // SpeechRecognition and MediaRecorder are globally stubbed.
      const initialSpeechRecognitionCallCount = MockSpeechRecognition.mock.calls.length; // Constructor called in outer beforeEach


      // Act
      const success = await audioRecorder.startRecording();

      // Assert
      expect(success).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

      expect(MockMediaRecorder).toHaveBeenCalledTimes(1);
      expect(mockMediaRecorderInstance.start).toHaveBeenCalledTimes(1);

      // SpeechRecognition should have been initialized in the constructor, not again here.
      // We verify its properties were set.
      expect(MockSpeechRecognition.mock.calls.length).toBe(initialSpeechRecognitionCallCount);
      if (audioRecorder.isSupported()) { // Check if recognition was initialized
          expect(mockRecognitionInstance.lang).toBe(DEFAULT_AUDIO_RECORDER_CONFIG.LANG);
          expect(mockRecognitionInstance.continuous).toBe(true);
          expect(mockRecognitionInstance.interimResults).toBe(true);
      }
      expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1);

      // Simulate the onstart event for SpeechRecognition
      if (mockRecognitionInstance.onstart) {
        (mockRecognitionInstance.onstart as () => void)();
      }
      // Simulate MediaRecorder state change
      mockMediaRecorderInstance.state = 'recording';


      expect(audioRecorder.getState().isRecording).toBe(true);
      expect(audioRecorder.getState().isPaused).toBe(false);
      // The first call to onRecordingStateChange happens when recognition starts
      expect(mockOnRecordingStateChange).toHaveBeenCalledWith(expect.objectContaining({
        isRecording: true,
        isPaused: false,
        // duration will be 0 initially
      }));
      expect(referencedErrorHandlerLogError).not.toHaveBeenCalled();
    });

    it('should handle microphone permission denied and log error', async () => {
      // Arrange
      const permissionError = new DOMException('Permission denied by user', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValueOnce(permissionError);

      // Act
      const success = await audioRecorder.startRecording();

      // Assert
      expect(success).toBe(false);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      expect(MockMediaRecorder).not.toHaveBeenCalled();
      expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
      expect(audioRecorder.getState().isRecording).toBe(false);

      // As per previous findings, AudioRecorder logs "Failed to start recording" and the actual error.
      expect(referencedErrorHandlerLogError).toHaveBeenCalledWith('Failed to start recording', permissionError);
      expect(mockOnRecordingStateChange).not.toHaveBeenCalled();
    });

    it('should not start if SpeechRecognition API is not supported (based on isSupported())', async () => {
      // Arrange: Create a new AudioRecorder instance in an environment where SpeechRecognition is not available.
      vi.stubGlobal('SpeechRecognition', undefined);
      vi.stubGlobal('webkitSpeechRecognition', undefined);

      vi.resetModules(); // Force re-import of modules to pick up undefined SpeechRecognition
      const { AudioRecorder: ReImportedAudioRecorder } = await import('../../../src/services/AudioRecorder');
      const { ErrorHandler: FreshErrorHandler } = await import('../../../src/utils'); // Get fresh mock
      const localReferencedErrorHandlerLogError = FreshErrorHandler.logError as ReturnType<typeof vi.fn>;
      localReferencedErrorHandlerLogError.mockClear();

      const localAudioRecorder = new ReImportedAudioRecorder();
      localAudioRecorder.onRecordingStateChange(mockOnRecordingStateChange); // Attach callback

      // Restore globals for other tests
      vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
      vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);

      // Act
      const success = await localAudioRecorder.startRecording();

      // Assert
      expect(success).toBe(false);
      expect(localAudioRecorder.isSupported()).toBe(false);
      expect(mockGetUserMedia).not.toHaveBeenCalled();

      // The constructor for AudioRecorder doesn't log an error if SpeechRecognition is simply undefined.
      // It just sets this.recognition to null.
      // startRecording checks isSupported() first.
      expect(localReferencedErrorHandlerLogError).toHaveBeenCalledWith(ERROR_MESSAGES.AUDIO.NO_SPEECH_RECOGNITION_API, undefined);
      expect(localAudioRecorder.getState().isRecording).toBe(false);
      expect(mockOnRecordingStateChange).not.toHaveBeenCalled();
    });

    it('should log a warning and not restart if already recording', async () => {
      // Arrange: Successfully start recording
      // Ensure getUserMedia is primed for this specific test's startRecording call
      mockGetUserMedia.mockResolvedValueOnce({
        getTracks: vi.fn(() => [mockMediaStreamTrack]),
        getAudioTracks: vi.fn(() => [mockMediaStreamTrack]),
      } as unknown as MediaStream);
      await audioRecorder.startRecording();

      // Simulate events that set internal state correctly after starting
      if (mockRecognitionInstance.onstart) (mockRecognitionInstance.onstart as () => void)();
      mockMediaRecorderInstance.state = 'recording';
      // Force state for robustness in test, as internal event chain might be complex
      // This ensures that the recorder believes it's recording.
      (audioRecorder as any).state.isRecording = true;
      (audioRecorder as any).state.isPaused = false;
      (audioRecorder as any).mediaStream = { getTracks: () => [mockMediaStreamTrack] } as MediaStream; // Ensure stream is set

      // Clear mocks for the second call (the one being tested)
      mockGetUserMedia.mockClear();
      mockRecognitionInstance.start.mockClear();
      MockMediaRecorder.mockClear(); // Constructor for MediaRecorder
      mockMediaRecorderInstance.start.mockClear(); // start method for MediaRecorder instance
      mockOnRecordingStateChange.mockClear();
      referencedErrorHandlerLogWarning.mockClear();
      referencedErrorHandlerLogError.mockClear();


      // Act: Attempt to start recording again
      const success = await audioRecorder.startRecording();

      // Assert
      expect(success).toBe(false); // Should indicate failure to start again
      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
      expect(MockMediaRecorder).not.toHaveBeenCalled(); // Constructor not called

      expect(referencedErrorHandlerLogWarning).toHaveBeenCalledWith('Recording is already in progress.');
      expect(mockOnRecordingStateChange).not.toHaveBeenCalled();
      expect(referencedErrorHandlerLogError).not.toHaveBeenCalled();
    });
  });

  describe('stopRecording()', () => {
    beforeEach(() => {
      // Reset relevant mocks before each test in this block
      // audioRecorder instance is taken from the outer beforeEach
      mockRecognitionInstance.stop.mockClear();
      mockRecognitionInstance.onend = null; // Reset event handler
      mockMediaRecorderInstance.stop.mockClear();
      mockMediaRecorderInstance.state = 'inactive';
      mockMediaStreamTrackStop.mockClear();
      mockOnRecordingStateChange.mockClear();
      referencedErrorHandlerLogError.mockClear();
      // No specific onErrorCallback for AudioRecorder, uses ErrorHandler

      // Ensure SpeechRecognition is available for these tests by default
      vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
      vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);
    });

    it('should stop MediaRecorder, SpeechRecognition, and stream tracks if recording', async () => {
      // Arrange: Start recording first
      // Ensure getUserMedia is primed for this specific test's startRecording call
      mockGetUserMedia.mockResolvedValueOnce({
        getTracks: vi.fn(() => [mockMediaStreamTrack]),
        getAudioTracks: vi.fn(() => [mockMediaStreamTrack]),
      } as unknown as MediaStream);
      await audioRecorder.startRecording();

      // Simulate conditions to ensure recorder believes it's active
      if (mockRecognitionInstance.onstart) (mockRecognitionInstance.onstart as () => void)();
      mockMediaRecorderInstance.state = 'recording';
      (audioRecorder as any).state.isRecording = true; // Force internal state
      (audioRecorder as any).mediaStream = { getTracks: () => [mockMediaStreamTrack] } as MediaStream; // Ensure stream is set

      expect(audioRecorder.getState().isRecording).toBe(true); // Pre-condition

      // Act
      audioRecorder.stopRecording();

      // Assert
      expect(mockRecognitionInstance.stop).toHaveBeenCalledTimes(1);
      expect(mockMediaRecorderInstance.stop).toHaveBeenCalledTimes(1);
      expect(mockMediaStreamTrack.stop).toHaveBeenCalledTimes(1);

      // Simulate SpeechRecognition.onend to complete the state transition
      if (mockRecognitionInstance.onend) {
        (mockRecognitionInstance.onend as () => void)();
      }
      // Simulate MediaRecorder state change to inactive after stop
      mockMediaRecorderInstance.state = 'inactive';

      expect(audioRecorder.getState().isRecording).toBe(false);
      expect(audioRecorder.getState().isPaused).toBe(false); // Should reset pause state

      // onRecordingStateChange is called by stopDurationTracking, which is called by onRecognitionEnd or directly in stopRecording
      // The exact number of calls might vary based on internal logic (e.g. if pause was also emitting state)
      // We are interested in the final state.
      expect(mockOnRecordingStateChange).toHaveBeenCalledWith(expect.objectContaining({
        isRecording: false,
        isPaused: false,
        // duration might be > 0 here
      }));
    });

    it('should not call stop on MediaRecorder or SpeechRecognition if not recording', () => {
      // Arrange: Ensure not recording (default state from beforeEach)
      (audioRecorder as any).state.isRecording = false; // Explicitly set for clarity
      mockMediaRecorderInstance.state = 'inactive';

      expect(audioRecorder.getState().isRecording).toBe(false); // Pre-condition

      // Act
      audioRecorder.stopRecording();

      // Assert
      expect(mockRecognitionInstance.stop).not.toHaveBeenCalled();
      expect(mockMediaRecorderInstance.stop).not.toHaveBeenCalled();
      expect(mockMediaStreamTrackStop).not.toHaveBeenCalled(); // Corrected mock name
      expect(mockOnRecordingStateChange).not.toHaveBeenCalled(); // No state change should occur
    });

    it('should handle cases where MediaStream or tracks might be null (e.g., if start failed partway)', () => {
      // Arrange: Simulate a state where recorder thinks it's active but stream/tracks are missing
      // This is an edge case test.
      (audioRecorder as any).recognition = mockRecognitionInstance; // Force set recognition instance
      (audioRecorder as any).mediaRecorder = mockMediaRecorderInstance; // Force set media recorder instance
      (audioRecorder as any).mediaStream = null; // Simulate missing stream
      (audioRecorder as any).state.isRecording = true; // Force internal state to "recording"
      mockMediaRecorderInstance.state = 'recording'; // Ensure mock media recorder also thinks it's recording


      // Act
      audioRecorder.stopRecording(); // Should not throw an error

      // Assert
      expect(mockRecognitionInstance.stop).toHaveBeenCalledTimes(1);
      expect(mockMediaRecorderInstance.stop).toHaveBeenCalledTimes(1);
      expect(mockMediaStreamTrackStop).not.toHaveBeenCalled(); // Because stream is null

      // Simulate SpeechRecognition.onend for full state transition
      if (mockRecognitionInstance.onend) {
        (mockRecognitionInstance.onend as () => void)();
      }
      mockMediaRecorderInstance.state = 'inactive';

      expect(audioRecorder.getState().isRecording).toBe(false);
      expect(mockOnRecordingStateChange).toHaveBeenCalledWith(expect.objectContaining({ isRecording: false }));
    });
  });

  describe('SpeechRecognition Event Handlers', () => {
    beforeEach(async () => {
      // Ensure SpeechRecognition is available
      vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
      vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);

      // Start recording to ensure event handlers are attached to mockRecognitionInstance
      // The audioRecorder instance from the outer scope is used.
      // Callbacks (mockOnTranscriptAvailable, mockOnRecordingStateChange, mockOnRecognitionEnd)
      // are already registered on it from the outer beforeEach.

      // Reset mocks that will be checked in these tests
      mockOnTranscriptAvailable.mockClear();
      referencedErrorHandlerLogError.mockClear();
      mockOnRecordingStateChange.mockClear();
      mockOnRecognitionEnd.mockClear();
      mockRecognitionInstance.start.mockClear(); // To check for restarts in onend

      // Prime getUserMedia for a successful start
      mockGetUserMedia.mockResolvedValueOnce({
        getTracks: vi.fn(() => [mockMediaStreamTrack]),
        getAudioTracks: vi.fn(() => [mockMediaStreamTrack]),
      } as unknown as MediaStream);
      await audioRecorder.startRecording();

      // After startRecording, the AudioRecorder should have assigned its internal handlers
      // to mockRecognitionInstance.onresult, .onerror, .onend.
      // Also, simulate that recognition has started to make these event handlers active.
      if (mockRecognitionInstance.onstart) {
        (mockRecognitionInstance.onstart as () => void)();
      }
      mockMediaRecorderInstance.state = 'recording';
      (audioRecorder as any).state.isRecording = true;
    });

    describe('onresult', () => {
      it('should call onTranscriptAvailable with interim results', () => {
        const mockEvent = {
          results: [
            [{ transcript: 'Hello', confidence: 0.9 }], // result 0, alternative 0
          ],
          resultIndex: 0,
        } as unknown as SpeechRecognitionEvent;
        (mockEvent.results[0] as any).isFinal = false; // Mark as interim

        expect(mockRecognitionInstance.onresult).toBeTypeOf('function');
        if (mockRecognitionInstance.onresult) {
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(mockEvent);
        }

        // AudioRecorder's logic: this.onTranscriptUpdateCallback(this.fullTranscript + this.currentTranscriptSegment, isFinal);
        // fullTranscript is initially empty. currentTranscriptSegment becomes 'Hello'.
        expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('Hello', false);
      });

      it('should call onTranscriptAvailable with final results and update fullTranscript', () => {
        const mockEvent = {
          results: [
            [{ transcript: 'Hello world', confidence: 0.95 }],
          ],
          resultIndex: 0,
        } as unknown as SpeechRecognitionEvent;
        (mockEvent.results[0] as any).isFinal = true; // Mark as final

        expect(mockRecognitionInstance.onresult).toBeTypeOf('function');
        if (mockRecognitionInstance.onresult) {
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(mockEvent);
        }

        expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('Hello world', true);
        // Check internal fullTranscript state (indirectly, or by sending another result)
        // After a final result, fullTranscript in AudioRecorder becomes "Hello world "
        // Let's send another interim result to verify this
        mockOnTranscriptAvailable.mockClear();
        const mockEvent2 = {
          results: [[{ transcript: ' again', confidence: 0.9 }]], resultIndex: 0,
        } as unknown as SpeechRecognitionEvent;
        (mockEvent2.results[0] as any).isFinal = false;
        if (mockRecognitionInstance.onresult) {
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(mockEvent2);
        }
        expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('Hello world again', false);
      });

      it('should accumulate transcript correctly for multiple segments', () => {
        const event1 = { results: [[{ transcript: 'Part 1 ' }]], resultIndex: 0 } as SpeechRecognitionEvent;
        (event1.results[0] as any).isFinal = false;

        const event2 = { results: [[{ transcript: 'final part.' }]], resultIndex: 0 } as SpeechRecognitionEvent;
         // Assuming event.resultIndex for the second event should be 0 if it's a new segment of the same utterance
         // or 1 if it's a new distinct result. The code uses slice(event.resultIndex)
         // Let's test based on the AudioRecorder's specific logic:
         // currentTranscriptSegment = Array.from(event.results).slice(event.resultIndex)...
         // if (isFinal) { this.fullTranscript += this.currentTranscriptSegment + ' '; }

        if (mockRecognitionInstance.onresult) {
          // First interim result
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(event1);
          expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('Part 1 ', false);

          // Second result, now final
          (event2.results[0] as any).isFinal = true;
          // If event2.resultIndex = 0, it means this final result replaces the previous interim "Part 1 " for the current segment.
          // The fullTranscript is still empty. currentTranscriptSegment becomes "final part."
          // Then fullTranscript becomes "final part. "
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(event2);
          expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('final part.', true); // Assuming fullTranscript was empty

          // To test accumulation of fullTranscript:
          // Send another final segment
          mockOnTranscriptAvailable.mockClear();
          const event3 = { results: [[{ transcript: 'Another final.' }]], resultIndex: 0 } as SpeechRecognitionEvent;
          (event3.results[0] as any).isFinal = true;
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(event3);
          // fullTranscript was "final part. "
          // currentTranscriptSegment is "Another final."
          // callback gets "final part. Another final."
          // new fullTranscript becomes "final part. Another final. "
          expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('final part. Another final.', true);

          // And an interim after that
          mockOnTranscriptAvailable.mockClear();
          const event4 = { results: [[{ transcript: ' Subsequent interim.' }]], resultIndex: 0 } as SpeechRecognitionEvent;
          (event4.results[0] as any).isFinal = false;
          (mockRecognitionInstance.onresult as (event: SpeechRecognitionEvent) => void)(event4);
          expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('final part. Another final. Subsequent interim.', false);
        }
      });
    });

    describe('onerror', () => {
      it('should call ErrorHandler.logError, stop recording, and update state', () => {
        const mockErrorEvent = { error: 'network', message: 'Network issue' } as SpeechRecognitionErrorEvent;

        // Spy on stopRecording to ensure it's called internally
        const stopRecordingSpy = vi.spyOn(audioRecorder, 'stopRecording');

        expect(mockRecognitionInstance.onerror).toBeTypeOf('function');
        if (mockRecognitionInstance.onerror) {
          (mockRecognitionInstance.onerror as (event: SpeechRecognitionErrorEvent) => void)(mockErrorEvent);
        }

        expect(referencedErrorHandlerLogError).toHaveBeenCalledWith(`Speech recognition error: ${mockErrorEvent.error}`, mockErrorEvent.message);
        expect(stopRecordingSpy).toHaveBeenCalledTimes(1);

        // Assuming stopRecording and subsequent onend (if triggered by stop) will lead to these states
        // Manually trigger onend if stopRecording doesn't synchronously call it or change state fully
        if (mockRecognitionInstance.onend) {
             (mockRecognitionInstance.onend as () => void)();
        }
        mockMediaRecorderInstance.state = 'inactive';


        expect(audioRecorder.getState().isRecording).toBe(false);
        // AudioRecorder doesn't have an 'isError' state, but it calls onRecordingStateChange with isRecording: false
        expect(mockOnRecordingStateChange).toHaveBeenCalledWith(expect.objectContaining({ isRecording: false }));
        stopRecordingSpy.mockRestore();
      });
    });

    describe('onend', () => {
      it('should call onRecognitionEnd callback, update state, and not restart by default', () => {
        expect(mockRecognitionInstance.onend).toBeTypeOf('function');
        if (mockRecognitionInstance.onend) {
          (mockRecognitionInstance.onend as () => void)();
        }

        expect(audioRecorder.getState().isRecording).toBe(false);
        expect(mockOnRecordingStateChange).toHaveBeenCalledWith(expect.objectContaining({ isRecording: false }));
        expect(mockOnRecognitionEnd).toHaveBeenCalledTimes(1);
        expect(mockRecognitionInstance.start).not.toHaveBeenCalled(); // No restart
      });

      it('should restart recognition if shouldRestartRecognition is true and it was recording', async () => {
        // Ensure it was "recording" before onend is called
        (audioRecorder as any).state.isRecording = true;
        (audioRecorder as any).recognition = mockRecognitionInstance; // Ensure recognition is set
        (audioRecorder as any).shouldRestartRecognition = true; // Explicitly set for test

        mockRecognitionInstance.start.mockClear(); // Clear previous start from beforeEach

        expect(mockRecognitionInstance.onend).toBeTypeOf('function');
        if (mockRecognitionInstance.onend) {
          (mockRecognitionInstance.onend as () => void)();
        }

        // Advance timers for the restart delay
        await vi.advanceTimersByTimeAsync(DEFAULT_AUDIO_RECORDER_CONFIG.RECOGNITION_RESTART_DELAY + 50);

        expect(mockOnRecognitionEnd).toHaveBeenCalledTimes(1); // Called for the first end
        expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1); // Called again for restart

        // Simulate the onstart for the restarted recognition
        if (mockRecognitionInstance.onstart) {
            (mockRecognitionInstance.onstart as () => void)();
        }
        expect(audioRecorder.getState().isRecording).toBe(true); // Should be back to recording
      });

       it('should NOT restart recognition if shouldRestartRecognition is true BUT it was NOT recording (e.g. stopped manually)', async () => {
        (audioRecorder as any).state.isRecording = false; // Explicitly set to not recording
        (audioRecorder as any).recognition = mockRecognitionInstance;
        (audioRecorder as any).shouldRestartRecognition = true;

        mockRecognitionInstance.start.mockClear();

        expect(mockRecognitionInstance.onend).toBeTypeOf('function');
        if (mockRecognitionInstance.onend) {
          (mockRecognitionInstance.onend as () => void)();
        }

        await vi.advanceTimersByTimeAsync(DEFAULT_AUDIO_RECORDER_CONFIG.RECOGNITION_RESTART_DELAY + 50);

        expect(mockOnRecognitionEnd).toHaveBeenCalledTimes(1);
        expect(mockRecognitionInstance.start).not.toHaveBeenCalled();
        expect(audioRecorder.getState().isRecording).toBe(false);
      });
    });
  });

  describe('clearTranscript()', () => {
    beforeEach(() => {
      // audioRecorder instance is from the outer scope
      mockOnTranscriptAvailable.mockClear();
      // Ensure SpeechRecognition mock is available if any indirect calls occur, though not expected for clearTranscript
      vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
      vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);
    });

    it('should clear the fullTranscript and currentTranscriptSegment and call onTranscriptAvailable', () => {
      // Arrange: Populate some transcript data directly on the instance for testing
      (audioRecorder as any).fullTranscript = "Previous final text. ";
      (audioRecorder as any).currentTranscriptSegment = "Current segment";

      // Act
      audioRecorder.clearTranscript();

      // Assert
      // Verify internal state
      expect((audioRecorder as any).fullTranscript).toBe('');
      expect((audioRecorder as any).currentTranscriptSegment).toBe('');
      // Verify callback
      expect(mockOnTranscriptAvailable).toHaveBeenCalledTimes(1);
      expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('', false);
    });

    it('should call onTranscriptAvailable even if transcript is already empty', () => {
      // Arrange: Ensure transcripts are already empty (default state after construction or previous clear)
      (audioRecorder as any).fullTranscript = "";
      (audioRecorder as any).currentTranscriptSegment = "";

      // Act
      audioRecorder.clearTranscript();

      // Assert
      expect((audioRecorder as any).fullTranscript).toBe('');
      expect((audioRecorder as any).currentTranscriptSegment).toBe('');
      expect(mockOnTranscriptAvailable).toHaveBeenCalledTimes(1);
      expect(mockOnTranscriptAvailable).toHaveBeenCalledWith('', false);
    });
  });
});
