/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startTime: number | null;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: null,
  };
  private onDataAvailable?: (transcript: string) => void;
  private onStateChange?: (state: RecordingState) => void;
  private onError?: (error: any) => void; // New callback property
  private recognition: any = null;
  private durationInterval: number | null = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    try {
      // Check for speech recognition support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }

          if (finalTranscript && this.onDataAvailable) {
            this.onDataAvailable(finalTranscript.trim());
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (this.onError) {
            this.onError(event.error); // Call the new callback
          }
        };

        this.recognition.onend = () => {
          // Restart recognition if we're still recording
          if (this.state.isRecording && !this.state.isPaused) {
            setTimeout(() => {
              try {
                if (this.recognition && this.state.isRecording && !this.state.isPaused) { // Re-check state before starting
                  this.recognition.start();
                }
              } catch (error) {
                console.error('Speech recognition failed to restart:', error);
                if (this.onError) {
                  this.onError(error);
                }
              }
            }, 100); // Short delay before attempting restart
          }
        };
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
    }
  }

  public async startRecording(): Promise<boolean> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Set up MediaRecorder for audio recording
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        // You can save or process the audio blob here if needed
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      }

      // Update state
      this.state = {
        isRecording: true,
        isPaused: false,
        duration: 0,
        startTime: Date.now(),
      };

      // Start duration tracking
      this.startDurationTracking();
      this.notifyStateChange();

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  public stopRecording(): void {
    try {
      // Stop MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop speech recognition
      if (this.recognition) {
        this.recognition.stop();
      }

      // Stop stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Stop duration tracking
      this.stopDurationTracking();

      // Update state
      this.state = {
        isRecording: false,
        isPaused: false,
        duration: this.state.duration,
        startTime: null,
      };

      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  public pauseRecording(): void {
    try {
      if (this.mediaRecorder && this.state.isRecording && !this.state.isPaused) {
        this.mediaRecorder.pause();
        
        if (this.recognition) {
          this.recognition.stop();
        }

        this.state.isPaused = true;
        this.stopDurationTracking();
        this.notifyStateChange();
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  public resumeRecording(): void {
    try {
      if (this.mediaRecorder && this.state.isRecording && this.state.isPaused) {
        this.mediaRecorder.resume();
        
        if (this.recognition) {
          this.recognition.start();
        }

        this.state.isPaused = false;
        this.state.startTime = Date.now() - this.state.duration;
        this.startDurationTracking();
        this.notifyStateChange();
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  private startDurationTracking(): void {
    this.durationInterval = window.setInterval(() => {
      if (this.state.startTime) {
        this.state.duration = Date.now() - this.state.startTime;
        this.notifyStateChange();
      }
    }, 100);
  }

  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  public getState(): RecordingState {
    return { ...this.state };
  }

  public onTranscriptAvailable(callback: (transcript: string) => void): void {
    this.onDataAvailable = callback;
  }

  public onRecordingStateChange(callback: (state: RecordingState) => void): void {
    this.onStateChange = callback;
  }

  public onRecognitionError(callback: (error: any) => void): void {
    this.onError = callback;
  }

  public isSupported(): boolean {
    return !!(navigator.mediaDevices?.getUserMedia && 
             (window as any).MediaRecorder &&
             ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }

  public formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${formatNumber(hours)}:${formatNumber(minutes % 60)}:${formatNumber(seconds % 60)}`;
    } else {
      return `${formatNumber(minutes)}:${formatNumber(seconds % 60)}`;
    }
  }

  public cleanup(): void {
    this.stopRecording();
    this.onDataAvailable = undefined;
    this.onStateChange = undefined;
    this.onError = undefined; // Clean up the new callback
  }
}
