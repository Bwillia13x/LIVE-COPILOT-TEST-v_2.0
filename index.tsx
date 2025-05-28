/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {GoogleGenAI} from '@google/genai';
import { marked } from 'marked';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title, // Import Title for chart titles
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title // Register Title
);

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

interface Note {
  id: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
}

class VoiceNotesApp {
  private genAI: any;
  private mediaRecorder: MediaRecorder | null = null;
  private recordButton: HTMLButtonElement;
  private recordingStatus: HTMLDivElement;
  private rawTranscription: HTMLDivElement;
  private polishedNote: HTMLDivElement;
  private aiChartDisplayArea: HTMLDivElement; // New area for AI charts in raw section
  private newButton: HTMLButtonElement;
  private themeToggleButton: HTMLButtonElement;
  private themeToggleIcon: HTMLElement;
  private speechRecognition: any | null = null; // any for SpeechRecognition API compatibility
  private finalTranscript = '';
  private isRecording = false;
  private currentNote: Note | null = null;
  private stream: MediaStream | null = null;
  private editorTitle: HTMLDivElement;
  private recordingInterface: HTMLDivElement;
  private liveRecordingTitle: HTMLDivElement;
  private liveWaveformCanvas: HTMLCanvasElement | null;
  private liveWaveformCtx: CanvasRenderingContext2D | null = null;
  private liveRecordingTimerDisplay: HTMLDivElement;
  private statusIndicatorDiv: HTMLDivElement | null;

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private waveformDataArray: Uint8Array | null = null;
  private waveformDrawingId: number | null = null;
  private timerIntervalId: number | null = null;
  private recordingStartTime: number = 0;
  private activeAiChartInstances: Chart[] = []; // Store multiple chart instances

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.API_KEY!,
      apiVersion: 'v1alpha',
    });

    this.recordButton = document.getElementById(
      'recordButton',
    ) as HTMLButtonElement;
    this.recordingStatus = document.getElementById(
      'recordingStatus',
    ) as HTMLDivElement;
    this.rawTranscription = document.getElementById(
      'rawTranscription',
    ) as HTMLDivElement;
    this.polishedNote = document.getElementById(
      'polishedNote',
    ) as HTMLDivElement;
    this.aiChartDisplayArea = document.getElementById('aiChartDisplayArea') as HTMLDivElement;
    if (!this.aiChartDisplayArea) {
      console.warn('aiChartDisplayArea element not found. Charts will not be displayed in raw section.');
      // Create a dummy div to prevent errors if it's missing, though it won't be visible
      this.aiChartDisplayArea = document.createElement('div'); 
    }
    this.newButton = document.getElementById('newButton') as HTMLButtonElement;
    this.themeToggleButton = document.getElementById(
      'themeToggleButton',
    ) as HTMLButtonElement;
    this.themeToggleIcon = this.themeToggleButton.querySelector(
      'i',
    ) as HTMLElement;
    this.editorTitle = document.querySelector(
      '.editor-title',
    ) as HTMLDivElement;

    this.recordingInterface = document.querySelector(
      '.recording-interface',
    ) as HTMLDivElement;
    this.liveRecordingTitle = document.getElementById(
      'liveRecordingTitle',
    ) as HTMLDivElement;
    this.liveWaveformCanvas = document.getElementById(
      'liveWaveformCanvas',
    ) as HTMLCanvasElement;
    this.liveRecordingTimerDisplay = document.getElementById(
      'liveRecordingTimerDisplay',
    ) as HTMLDivElement;

    if (this.liveWaveformCanvas) {
      this.liveWaveformCtx = this.liveWaveformCanvas.getContext('2d');
    } else {
      console.warn(
        'Live waveform canvas element not found. Visualizer will not work.',
      );
    }

    if (this.recordingInterface) {
      this.statusIndicatorDiv = this.recordingInterface.querySelector(
        '.status-indicator',
      ) as HTMLDivElement;
    } else {
      console.warn('Recording interface element not found.');
      this.statusIndicatorDiv = null;
    }

    this.bindEventListeners();
    this.initTheme();
    this.createNewNote();

    this.recordingStatus.textContent = 'Ready to record';
    this.setupSpeechRecognition();
  }

  private escapeHtml(unsafe: string): string {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  private bindEventListeners(): void {
    this.recordButton.addEventListener('click', () => this.toggleRecording());
    this.newButton.addEventListener('click', () => this.createNewNote());
    this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    if (
      this.isRecording &&
      this.liveWaveformCanvas &&
      this.liveWaveformCanvas.style.display === 'block'
    ) {
      requestAnimationFrame(() => {
        this.setupCanvasDimensions();
      });
    }
  }

  private setupCanvasDimensions(): void {
    if (!this.liveWaveformCanvas || !this.liveWaveformCtx) return;

    const canvas = this.liveWaveformCanvas;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    this.liveWaveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      document.body.classList.remove('light-mode');
      this.themeToggleIcon.classList.remove('fa-moon');
      this.themeToggleIcon.classList.add('fa-sun');
    }
  }

  private toggleTheme(): void {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
      localStorage.setItem('theme', 'light');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      localStorage.setItem('theme', 'dark');
      this.themeToggleIcon.classList.remove('fa-moon');
      this.themeToggleIcon.classList.add('fa-sun');
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.recordingStatus.textContent = 'Speech recognition not supported in this browser.';
      this.recordButton.disabled = true;
      console.error('SpeechRecognition API not supported.');
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US'; // Or make this configurable

    this.speechRecognition.onstart = () => {
      this.recordingStatus.textContent = 'Listening...';
      this.recordButton.classList.add('recording');
      this.startLiveDisplay(); 
    };

    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Error: ' + event.error;
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      }
      if (event.error === 'audio-capture') {
        errorMessage = 'Microphone error. Please check permissions.';
      }
      if (event.error === 'not-allowed') {
        errorMessage = 'Permission to use microphone was denied.';
      }
      this.recordingStatus.textContent = errorMessage;
      this.stopRecording(); // Stop without processing if error
    };

    this.speechRecognition.onend = () => {
      this.isRecording = false;
      this.recordButton.classList.remove('recording');
      this.stopLiveDisplay();
      if (this.finalTranscript.trim() && this.currentNote) {
        this.currentNote.rawTranscription = this.finalTranscript;
        // No need to call this.rawTranscription.textContent = this.finalTranscript here as it's done by onresult
        this.recordingStatus.textContent = 'Processing final transcript...';
        this.getPolishedNote(); // Polish the final transcript
      } else if (!this.currentNote?.rawTranscription) {
        this.recordingStatus.textContent = 'Recording stopped. No final transcript.';
      }
    };

    this.speechRecognition.onresult = (event: any) => {
      let interimTranscript = '';
      let sessionFinalTranscript = ''; // Use a local variable to build final transcript for this session

      for (let i = 0; i < event.results.length; ++i) { // Iterate through all results received so far
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinalTranscript += transcriptPart;
        } else {
          // Only add to interimTranscript if it's from the current processing part onwards
          if (i >= event.resultIndex) {
             interimTranscript += transcriptPart;
          }
        }
      }

      this.finalTranscript = sessionFinalTranscript; // Update the class member with the full final transcript

      // Update the raw transcription display
      this.rawTranscription.textContent = this.finalTranscript + interimTranscript;
      if (this.rawTranscription.textContent.trim() !== '') {
          this.rawTranscription.classList.remove('placeholder-active');
      } else {
          // If everything is empty, restore placeholder
          const placeholder = this.rawTranscription.getAttribute('placeholder') || '';
          this.rawTranscription.textContent = placeholder;
          this.rawTranscription.classList.add('placeholder-active');
      }
      
      if (this.currentNote) {
        this.currentNote.rawTranscription = this.finalTranscript + interimTranscript; // Keep currentNote updated with combined view
      }
    };
  }

  private _executeStartRecording(): void {
    if (this.isRecording || !this.speechRecognition) return;

    this.finalTranscript = ''; 
    if (this.currentNote) this.currentNote.rawTranscription = '';
    const rawPlaceholder = this.rawTranscription.getAttribute('placeholder') || '';
    this.rawTranscription.textContent = rawPlaceholder;
    this.rawTranscription.classList.add('placeholder-active');

    try {
      this.speechRecognition.start();
      this.isRecording = true;
      // If MediaRecorder is still needed for the visualizer or backup,
      // it needs to be started here too, using this.stream if available.
      // Example: if (this.stream) this.setupAndStartMediaRecorder(this.stream);
      this.setupAudioVisualizer(); 
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.recordingStatus.textContent = 'Error starting recognition.';
      this.isRecording = false;
    }
  }

  private stopRecording(): void {
    if (!this.isRecording || !this.speechRecognition) return;

    try {
      this.speechRecognition.stop();
      // isRecording will be set to false in speechRecognition.onend
      // UI updates like button state and status text are also handled in onend or onstart
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      // Force stop UI updates if speechRecognition.stop() fails critically
      this.isRecording = false;
      this.recordButton.classList.remove('recording');
      this.recordButton.textContent = 'Record';
      this.recordingStatus.textContent = 'Error stopping. Ready to try again.';
      this.stopLiveDisplay(); // Ensure visualizer/timer stops
    }
  }

  private async toggleRecording(): Promise<void> {
    if (!this.isRecording) {
      this.startRecording(); // Will use SpeechRecognition
    } else {
      this.stopRecording(); // Will use SpeechRecognition
    }
  }

  private setupAudioVisualizer(): void {
    if (!this.stream || this.audioContext) return;

    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioContext.createAnalyser();

    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.75;

    const bufferLength = this.analyserNode.frequencyBinCount;
    this.waveformDataArray = new Uint8Array(bufferLength);

    source.connect(this.analyserNode);
  }

  private drawLiveWaveform(): void {
    if (
      !this.analyserNode ||
      !this.waveformDataArray ||
      !this.liveWaveformCtx ||
      !this.liveWaveformCanvas ||
      !this.isRecording
    ) {
      if (this.waveformDrawingId) cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
      return;
    }

    this.waveformDrawingId = requestAnimationFrame(() =>
      this.drawLiveWaveform(),
    );
    this.analyserNode.getByteFrequencyData(this.waveformDataArray);

    const ctx = this.liveWaveformCtx;
    const canvas = this.liveWaveformCanvas;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const bufferLength = this.analyserNode.frequencyBinCount;
    const numBars = Math.floor(bufferLength * 0.5);

    if (numBars === 0) return;

    const totalBarPlusSpacingWidth = logicalWidth / numBars;
    const barWidth = Math.max(1, Math.floor(totalBarPlusSpacingWidth * 0.7));
    const barSpacing = Math.max(0, Math.floor(totalBarPlusSpacingWidth * 0.3));

    let x = 0;

    const recordingColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-recording')
        .trim() || '#ff3b30';
    ctx.fillStyle = recordingColor;

    for (let i = 0; i < numBars; i++) {
      if (x >= logicalWidth) break;

      const dataIndex = Math.floor(i * (bufferLength / numBars));
      const barHeightNormalized = this.waveformDataArray[dataIndex] / 255.0;
      let barHeight = barHeightNormalized * logicalHeight;

      if (barHeight < 1 && barHeight > 0) barHeight = 1;
      barHeight = Math.round(barHeight);

      const y = Math.round((logicalHeight - barHeight) / 2);

      ctx.fillRect(Math.floor(x), y, barWidth, barHeight);
      x += barWidth + barSpacing;
    }
  }

  private updateLiveTimer(): void {
    if (!this.isRecording || !this.liveRecordingTimerDisplay) return;
    const now = Date.now();
    const elapsedMs = now - this.recordingStartTime;

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((elapsedMs % 1000) / 10);

    this.liveRecordingTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  private startLiveDisplay(): void {
    if (
      !this.recordingInterface ||
      !this.liveRecordingTitle ||
      !this.liveWaveformCanvas ||
      !this.liveRecordingTimerDisplay
    ) {
      console.warn(
        'One or more live display elements are missing. Cannot start live display.',
      );
      return;
    }

    this.recordingInterface.classList.add('is-live');
    this.liveRecordingTitle.style.display = 'block';
    this.liveWaveformCanvas.style.display = 'block';
    this.liveRecordingTimerDisplay.style.display = 'block';

    this.setupCanvasDimensions();

    if (this.statusIndicatorDiv) this.statusIndicatorDiv.style.display = 'none';

    const iconElement = this.recordButton.querySelector(
      '.record-button-inner i',
    ) as HTMLElement;
    if (iconElement) {
      iconElement.classList.remove('fa-microphone');
      iconElement.classList.add('fa-stop');
    }

    const currentTitle = this.editorTitle.textContent?.trim();
    const placeholder =
      this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
    this.liveRecordingTitle.textContent =
      currentTitle && currentTitle !== placeholder
        ? currentTitle
        : 'New Recording';

    this.setupAudioVisualizer();
    this.drawLiveWaveform();

    this.recordingStartTime = Date.now();
    this.updateLiveTimer();
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
  }

  private stopLiveDisplay(): void {
    if (
      !this.recordingInterface ||
      !this.liveRecordingTitle ||
      !this.liveWaveformCanvas ||
      !this.liveRecordingTimerDisplay
    ) {
      if (this.recordingInterface)
        this.recordingInterface.classList.remove('is-live');
      return;
    }
    this.recordingInterface.classList.remove('is-live');
    this.liveRecordingTitle.style.display = 'none';
    this.liveWaveformCanvas.style.display = 'none';
    this.liveRecordingTimerDisplay.style.display = 'none';

    if (this.statusIndicatorDiv)
      this.statusIndicatorDiv.style.display = 'block';

    const iconElement = this.recordButton.querySelector(
      '.record-button-inner i',
    ) as HTMLElement;
    if (iconElement) {
      iconElement.classList.remove('fa-stop');
      iconElement.classList.add('fa-microphone');
    }

    if (this.waveformDrawingId) {
      cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
    }
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.liveWaveformCtx && this.liveWaveformCanvas) {
      this.liveWaveformCtx.clearRect(
        0,
        0,
        this.liveWaveformCanvas.width,
        this.liveWaveformCanvas.height,
      );
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext
          .close()
          .catch((e) => console.warn('Error closing audio context', e));
      }
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.waveformDataArray = null;
  }

  private async startRecording(): Promise<void> { 
    try {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.recordingStatus.textContent = 'Requesting microphone access...';

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._executeStartRecording(); 
      } catch (err) {
        console.error('Error getting media stream for permission check:', err);
        const localErrorMessage = err instanceof Error ? err.message : String(err);
        const localErrorName = err instanceof Error ? err.name : 'Unknown';
        if (localErrorName === 'NotAllowedError' || localErrorName === 'PermissionDeniedError') {
          this.recordingStatus.textContent = 'Microphone permission denied. Please check browser settings.';
        } else if (localErrorName === 'NotFoundError' || (localErrorName === 'DOMException' && localErrorMessage.includes('Requested device not found'))) {
          this.recordingStatus.textContent = 'No microphone found. Please connect a microphone.';
        } else if (localErrorName === 'NotReadableError' || localErrorName === 'AbortError' || (localErrorName === 'DOMException' && localErrorMessage.includes('Could not start audio source'))) {
          this.recordingStatus.textContent = 'Cannot access microphone. It might be in use or misconfigured.';
        } else {
          this.recordingStatus.textContent = `Could not access microphone: ${localErrorMessage}`;
        }
        this.isRecording = false;
        this.recordButton.classList.remove('recording');
        return;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError'
      ) {
        this.recordingStatus.textContent =
          'Microphone permission denied. Please check browser settings and reload page.';
      } else if (
        errorName === 'NotFoundError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Requested device not found'))
      ) {
        this.recordingStatus.textContent =
          'No microphone found. Please connect a microphone.';
      } else if (
        errorName === 'NotReadableError' ||
        errorName === 'AbortError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Failed to allocate audiosource'))
      ) {
        this.recordingStatus.textContent =
          'Cannot access microphone. It may be in use by another application.';
      } else {
        this.recordingStatus.textContent = `Error: ${errorMessage}`;
      }

      this.isRecording = false;
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.recordButton.classList.remove('recording');
      this.recordButton.setAttribute('title', 'Start Recording');
      this.stopLiveDisplay();
    }
  }
private async getPolishedNote(): Promise<void> {
    try {
      if (
        !this.rawTranscription.textContent ||
        this.rawTranscription.textContent.trim() === '' ||
        this.rawTranscription.classList.contains('placeholder-active')
      ) {
        this.recordingStatus.textContent = 'No transcription to polish';
        this.polishedNote.innerHTML =
          '<p><em>No transcription available to polish.</em></p>';
        if (this.polishedNote.textContent?.trim() === '') {
            const placeholderText = this.polishedNote.getAttribute('placeholder') || '';
            this.polishedNote.innerHTML = placeholderText;
            this.polishedNote.classList.add('placeholder-active');
        }
        return;
      }

      this.recordingStatus.textContent = 'Polishing note & analyzing for visuals...';

      const prompt = `You are an intelligent assistant helping to process transcribed notes.
The user's raw transcription is: "${this.rawTranscription.textContent}"

Your tasks are:
1. Polish the raw transcription (provided above) into a clean, well-formatted note. Remove filler words (um, uh, like), repetitions, and false starts. Format any lists or bullet points properly. Use markdown formatting for headings, lists, etc. Maintain all the original content and meaning. This is Task 1. The output of this task is "polishedNoteText".

2. Analyze the ORIGINAL RAW TRANSCRIPTION (provided at the very top, NOT the polished note from Task 1) to identify if the user is explicitly providing data suitable for a simple chart (specifically bar, line, or pie charts). This is Task 2.
   - If such explicit data is found in the ORIGINAL RAW TRANSCRIPTION:
     - Determine the most appropriate chart_type ("bar", "line", or "pie").
     - Create a suitable title for the chart based on the raw data.
     - Extract the data labels (e.g., categories for a bar chart, x-axis points for a line chart) from the raw data.
     - Extract the datasets from the raw data. Each dataset should have a label (series name) and a list of numerical data points.
   - If no explicit chartable data is found in the ORIGINAL RAW TRANSCRIPTION in Task 2, OR if the data is too complex for a simple chart, proceed to Task 3.

3. Conceptual Visualization (Only if Task 2 does not yield a chart suggestion). This is Task 3.
   - Analyze the ORIGINAL RAW TRANSCRIPTION for requests to visualize common concepts, mathematical functions (e.g., "quadratic curve", "linear function y = 2x + 1", "sine wave", "basic supply and demand graph"), or general data patterns where specific numerical data points are NOT provided by the user in the raw transcription.
   - If such a conceptual request is identified in the ORIGINAL RAW TRANSCRIPTION:
     - Determine the most appropriate chart_type (usually "line" for functions/curves, but could be others like "bar" for simple comparisons if implied).
     - Create a suitable title for the chart that reflects the concept (e.g., "Illustrative Quadratic Curve", "Sample Sine Wave").
     - Generate ILLUSTRATIVE MOCK DATA (labels and datasets) to represent the concept. The data should be simple and clear.
       - For example, for a "quadratic curve" request in the raw transcription, you might generate y-values for x-values from -5 to 5 for a simple function like y = x^2. The labels would be the x-values, and one dataset would contain the y-values.
       - For a "supply and demand graph" request, generate two datasets: one for an upward sloping supply curve and one for a downward sloping demand curve, with appropriate labels for quantity (x-axis) and price (y-axis).
       - For a "sine wave" request, generate y-values for x-values from 0 to 2*PI.
     - The generated data should be sufficient to clearly illustrate the concept (e.g., 10-20 data points for curves).
   - If the concept is too abstract, too complex to generate simple sample data for, or if the request is unclear from the raw transcription, do not suggest a chart for this conceptual task.

IMPORTANT: Prioritize Task 2 (explicit data from raw transcription). If the user provides explicit data in the raw transcription, use that. Only attempt Task 3 (conceptual visualization with mock data from raw transcription) if Task 2 does not result in a chart suggestion.

Return your response as a single JSON object with the following structure:
{
  "polishedNoteText": "The markdown formatted polished note from Task 1...",
  "chartSuggestion": { /* This key should be null if no chart is suggested from Task 2 or 3 (based on ORIGINAL RAW TRANSCRIPTION) */
    "chartType": "bar", /* or "line", "pie" */
    "title": "Chart Title from AI",
    "data": {
      "labels": ["Label1", "Label2", "Label3"],
      "datasets": [
        {
          "label": "Dataset 1 Name",
          "data": [10, 20, 30]
        }
      ]
    }
  }
}

Raw transcription:
${this.rawTranscription.textContent}`;

      const contents = [{text: prompt}];
      const rawApiResponse = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
      });

      let polishedText = '';
      let chartSuggestion: any = null;

      try {
        let responseText = rawApiResponse.text;
        if (responseText.startsWith('```json')) {
          responseText = responseText.substring(7);
        }
        if (responseText.endsWith('```')) {
          responseText = responseText.substring(0, responseText.length - 3);
        }
        responseText = responseText.trim();
        const apiResponse = JSON.parse(responseText);
        polishedText = apiResponse.polishedNoteText || '';
        chartSuggestion = apiResponse.chartSuggestion || null;
        if (chartSuggestion) {
          console.log('[AIChart] Chart suggestion received:', chartSuggestion);
        }
      } catch (e) {
        console.error('Error parsing AI response JSON:', e, 'Raw response:', rawApiResponse.text);
        polishedText = rawApiResponse.text; // Fallback to raw text
        this.recordingStatus.textContent = 'Error processing AI response. Displaying raw polished text.';
      }

      // We no longer clear the entire aiChartDisplayArea here for every new chart.
      // It will accumulate charts. It's only cleared fully on createNewNote.

      if (polishedText) {
        const htmlContent = marked.parse(polishedText);
        this.polishedNote.innerHTML = htmlContent;
        if (polishedText.trim() !== '') {
          this.polishedNote.classList.remove('placeholder-active');
        } else {
          const placeholder = this.polishedNote.getAttribute('placeholder') || '';
          this.polishedNote.innerHTML = placeholder;
          this.polishedNote.classList.add('placeholder-active');
        }

        let noteTitleSet = false;
        const lines = polishedText.split('\n').map((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith('#')) {
            const title = line.replace(/^#+\s+/, '').trim();
            if (this.editorTitle && title) {
              this.editorTitle.textContent = title;
              this.editorTitle.classList.remove('placeholder-active');
              noteTitleSet = true;
              break;
            }
          }
        }
        if (!noteTitleSet && this.editorTitle) {
          for (const line of lines) {
            if (line.length > 0) {
              let potentialTitle = line.replace(/^[\*_\`#\-\>\s\[\]\(.\d)]+/, '');
              potentialTitle = potentialTitle.replace(/[\*_\`#]+$/, '').trim();
              if (potentialTitle.length > 3) {
                const maxLength = 60;
                this.editorTitle.textContent = potentialTitle.substring(0, maxLength) + (potentialTitle.length > maxLength ? '...' : '');
                this.editorTitle.classList.remove('placeholder-active');
                noteTitleSet = true;
                break;
              }
            }
          }
        }
        if (!noteTitleSet && this.editorTitle) {
          const currentEditorText = this.editorTitle.textContent?.trim();
          const placeholderText = this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
          if (currentEditorText === '' || currentEditorText === placeholderText) {
            this.editorTitle.textContent = placeholderText;
            if (!this.editorTitle.classList.contains('placeholder-active')) {
              this.editorTitle.classList.add('placeholder-active');
            }
          }
        }
        if (this.currentNote) this.currentNote.polishedNote = polishedText;

        // AI-driven chart rendering logic
        if (chartSuggestion && chartSuggestion.chartType && chartSuggestion.data && chartSuggestion.data.labels && chartSuggestion.data.datasets) {
          console.log('[AIChart] Attempting to render AI suggested chart.');
          const canvasId = `ai-chart-${Date.now()}`;
          let chartTitleHTML = '';
          if (chartSuggestion.title) {
            chartTitleHTML = `<h3>${this.escapeHtml(chartSuggestion.title)}</h3>`;
          }
          const chartContainerHTML = `${chartTitleHTML}<div class="chart-container" style="width:100%; max-width:600px; height:400px; margin: 20px auto 0 auto;"><canvas id="${canvasId}"></canvas></div>`;
          if (this.aiChartDisplayArea) {
            // Append the new chart container to the display area
            const newChartDiv = document.createElement('div');
            newChartDiv.innerHTML = chartContainerHTML;
            this.aiChartDisplayArea.appendChild(newChartDiv);
            this.aiChartDisplayArea.scrollTop = this.aiChartDisplayArea.scrollHeight; // Scroll to the new chart
          } else {
            // Fallback if the div isn't found, though constructor tries to handle this
            this.polishedNote.innerHTML += chartContainerHTML; 
            console.warn('aiChartDisplayArea not found, chart appended to polishedNote as fallback.');
          }

          
          setTimeout(() => {
              console.log(`[AIChart] Calling renderAiChart('${canvasId}', chartSuggestion)`);
              this.renderAiChart(canvasId, chartSuggestion); // Actual call to the renamed function
          }, 0);
        } else if (chartSuggestion) {
          console.warn('[AIChart] Chart suggestion received, but data or chartType is incomplete:', chartSuggestion);
        }

      } else {
        this.recordingStatus.textContent = 'Polishing failed or returned empty.';
        this.polishedNote.innerHTML = '<p><em>Polishing returned empty. Raw transcription is available.</em></p>';
        if (this.polishedNote.textContent?.trim() === '') {
            const placeholder = this.polishedNote.getAttribute('placeholder') || '';
            this.polishedNote.innerHTML = placeholder;
            this.polishedNote.classList.add('placeholder-active');
        }
      }

      if (!this.recordingStatus.textContent?.includes('Error processing AI response')) {
        this.recordingStatus.textContent = 'Note polished. Ready for next recording.';
      }

    } catch (error) {
      console.error('Error in getPolishedNote:', error);
      this.recordingStatus.textContent = 'Error polishing note.';
      this.polishedNote.innerHTML = '<p><em>An error occurred during polishing.</em></p>';
    }
  }

  private renderAiChart(canvasId: string, chartDetails: any): void {
    console.log('[AIChart] renderAiChart received:', canvasId, JSON.parse(JSON.stringify(chartDetails)));

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.error(`[AIChart] Canvas element with ID '${canvasId}' not found.`);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error(`[AIChart] Could not get 2D context for canvas '${canvasId}'.`);
      return;
    }

    if (!chartDetails || !chartDetails.chartType || !chartDetails.data || !chartDetails.data.labels || !chartDetails.data.datasets) {
      console.error('[AIChart] Invalid or incomplete chartDetails received:', chartDetails);
      // Optionally, render a message on the canvas
      ctx.font = '16px Arial';
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText('Error: Invalid chart data from AI.', canvas.width / 2, canvas.height / 2);
      return;
    }

    const chartType = chartDetails.chartType.toLowerCase(); // 'bar', 'line', 'pie'
    const aiLabels = chartDetails.data.labels;
    const aiDatasets = chartDetails.data.datasets;

    const defaultBgColors = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 89, 0.7)'
    ];
    const defaultBorderColors = defaultBgColors.map(color => color.replace('0.7', '1'));

    const datasets = aiDatasets.map((ds: any, index: number) => {
      const baseConf: any = {
        label: ds.label || `Dataset ${index + 1}`,
        data: ds.data,
      };
      if (chartType === 'pie') {
        // For pie charts, backgroundColor is an array for slices
        baseConf.backgroundColor = ds.data.map((_:any, i:number) => defaultBgColors[i % defaultBgColors.length]);
        baseConf.borderColor = ds.data.map((_:any, i:number) => defaultBorderColors[i % defaultBorderColors.length]);
        baseConf.borderWidth = 1;
      } else if (chartType === 'line') {
        baseConf.borderColor = defaultBorderColors[index % defaultBorderColors.length];
        baseConf.backgroundColor = defaultBgColors[index % defaultBgColors.length]; // Often for area under line
        baseConf.fill = ds.fill !== undefined ? ds.fill : false; // AI could specify fill
        baseConf.tension = ds.tension !== undefined ? ds.tension : 0.1;
      } else { // bar and other types
        baseConf.backgroundColor = defaultBgColors[index % defaultBgColors.length];
        baseConf.borderColor = defaultBorderColors[index % defaultBorderColors.length];
        baseConf.borderWidth = 1;
      }
      return baseConf;
    });

    const chartConfig: any = {
      type: chartType,
      data: {
        labels: aiLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            display: datasets.length > 1 || chartType === 'pie', // Show legend if multiple datasets or pie
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
      },
    };

    if (chartDetails.title) {
      chartConfig.options.plugins.title = {
        display: true,
        text: chartDetails.title,
        font: { size: 16 },
        padding: { top: 10, bottom: 20 } // Add some padding for the title
      };
    }

    if (chartType === 'bar' || chartType === 'line') {
      chartConfig.options.scales = {
        x: {
          display: true,
          title: {
            display: chartDetails.data.xAxisLabel ? true : false, // AI could provide xAxisLabel
            text: chartDetails.data.xAxisLabel || '',
          },
        },
        y: {
          display: true,
          title: {
            display: chartDetails.data.yAxisLabel ? true : false, // AI could provide yAxisLabel
            text: chartDetails.data.yAxisLabel || '',
          },
          beginAtZero: true,
        },
      };
      // If AI provides specific scale types (e.g. 'linear', 'logarithmic', 'category')
      if (chartDetails.data.xScaleType) chartConfig.options.scales.x.type = chartDetails.data.xScaleType;
      if (chartDetails.data.yScaleType) chartConfig.options.scales.y.type = chartDetails.data.yScaleType;

    } else if (chartType === 'pie') {
      // Pie charts don't typically use scales in the same way
      // Ensure legend is helpful for pie charts
    }

    try {
      console.log('[AIChart] Final chart config:', JSON.parse(JSON.stringify(chartConfig)));
      // Destroy previous instance if any, before creating a new one on potentially the same canvas ID after re-adding to DOM
      // (Though current logic creates new canvas IDs, this is belt-and-suspenders for robustness)
      const newChartInstance = new Chart(ctx, chartConfig);
      this.activeAiChartInstances.push(newChartInstance);
      console.log('[AIChart] Chart rendered successfully.');
    } catch (error) {
      console.error('[AIChart] Error rendering chart:', error, 'Config was:', chartConfig);
      ctx.font = '14px Arial';
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText('Error rendering chart. See console for details.', canvas.width / 2, canvas.height / 2);
    }
  }

  private createNewNote(): void {
    this.currentNote = {
      id: `note_${Date.now()}`,
      rawTranscription: '',
      polishedNote: '',
      timestamp: Date.now(),
    };

    const rawPlaceholder =
      this.rawTranscription.getAttribute('placeholder') || '';
    this.rawTranscription.textContent = rawPlaceholder;
    this.rawTranscription.classList.add('placeholder-active');

    const polishedPlaceholder =
      this.polishedNote.getAttribute('placeholder') || '';
    this.polishedNote.innerHTML = polishedPlaceholder;
    this.polishedNote.classList.add('placeholder-active');

    if (this.editorTitle) {
      const placeholder =
        this.editorTitle.getAttribute('placeholder') || 'Untitled Note';
      this.editorTitle.textContent = placeholder;
      this.editorTitle.classList.add('placeholder-active');
    }
    // Destroy all active chart instances and clear the array
    this.activeAiChartInstances.forEach(chart => chart.destroy());
    this.activeAiChartInstances = [];

    if (this.aiChartDisplayArea) {
        this.aiChartDisplayArea.innerHTML = ''; // Clear the chart display area completely
    }
    this.recordingStatus.textContent = 'Ready to record';

    if (this.isRecording) {
      this.mediaRecorder?.stop();
      this.isRecording = false;
      this.recordButton.classList.remove('recording');
    } else {
      this.stopLiveDisplay();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VoiceNotesApp();

  document
    .querySelectorAll<HTMLElement>('[contenteditable][placeholder]')
    .forEach((el: HTMLElement) => {
      const placeholder = el.getAttribute('placeholder')!;

      function updatePlaceholderState() {
        const currentText = (
          el.id === 'polishedNote' ? el.innerText : el.textContent
        )?.trim();

        if (currentText === '' || currentText === placeholder) {
          if (el.id === 'polishedNote' && currentText === '') {
            el.innerHTML = placeholder;
          } else if (currentText === '') {
            el.textContent = placeholder;
          }
          el.classList.add('placeholder-active');
        } else {
          el.classList.remove('placeholder-active');
        }
      }

      updatePlaceholderState();

      el.addEventListener('focus', function () {
        const currentText = (
          this.id === 'polishedNote' ? this.innerText : this.textContent
        )?.trim();
        if (currentText === placeholder) {
          if (this.id === 'polishedNote') this.innerHTML = '';
          else this.textContent = '';
          this.classList.remove('placeholder-active');
        }
      });

      el.addEventListener('blur', function () {
        updatePlaceholderState();
      });
    });
});

export {};
