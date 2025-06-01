/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorHandler } from '../utils.js';
import { SpeechRecognitionInstance, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/index.js';
import { AppConfig } from '../config/AppConfig.js'; // Import AppConfig

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
  private recognition: SpeechRecognitionInstance | null = null; // Use new type
  private durationInterval: number | null = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    try {
      // Check for speech recognition support
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
        const recorderConfig = AppConfig.getAudioRecorderConfig(); // Get config
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = recorderConfig.LANG;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptSegment = event.results[i];
            if (transcriptSegment.isFinal && transcriptSegment[0]) {
              finalTranscript += transcriptSegment[0].transcript + ' ';
            }
          }

          if (finalTranscript && this.onDataAvailable) {
            this.onDataAvailable(finalTranscript.trim());
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => { // Use new type
          ErrorHandler.logError('Speech recognition error', event.error || event.message || 'Unknown recognition error');
        };

        this.recognition.onend = () => {
          // Restart recognition if we're still recording
          if (this.state.isRecording && !this.state.isPaused) {
            setTimeout(() => {
              if (this.recognition && this.state.isRecording) {
                this.recognition.start();
              }
            }, AppConfig.getAudioRecorderConfig().RECOGNITION_RESTART_DELAY);
          }
        };
      }
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to initialize speech recognition', error instanceof Error ? error : new Error(String(error)));
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
        mimeType: AppConfig.getAudioRecorderConfig().MIME_TYPE
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
      this.mediaRecorder.start(AppConfig.getAudioRecorderConfig().TIMESLICE_INTERVAL);

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
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to start recording', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public stopRecording(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.recognition) {
        this.recognition.stop();
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      this.stopDurationTracking();
      this.state = {
        isRecording: false,
        isPaused: false,
        duration: this.state.duration,
        startTime: null,
      };
      this.notifyStateChange();
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to stop recording', error instanceof Error ? error : new Error(String(error)));
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
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to pause recording', error instanceof Error ? error : new Error(String(error)));
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
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to resume recording', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private startDurationTracking(): void {
    this.durationInterval = window.setInterval(() => {
      if (this.state.startTime) {
        this.state.duration = Date.now() - this.state.startTime;
        this.notifyStateChange();
      }
    }, AppConfig.getAudioRecorderConfig().DURATION_UPDATE_INTERVAL);
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
  }
}
