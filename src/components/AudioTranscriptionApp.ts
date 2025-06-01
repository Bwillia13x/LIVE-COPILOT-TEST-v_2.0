/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, AppState, ErrorContext, AllAIChartData, AIChartDataPayload, TopicDataInput, SentimentDataInput, WordFrequencyInput, ManagedFile, StoredNote } from '../types/index.js';
import { APIService } from '../services/APIService.js';
import { ChartManager } from '../services/ChartManager.js';
import { TabNavigator } from './UIComponents/TabNavigator.js';
import { DataProcessor } from '../services/DataProcessor.js';
import { AudioRecorder, RecordingState } from '../services/AudioRecorder.js';
import { PerformanceMonitor } from '../services/PerformanceMonitor.js';
import { IntervalManager } from '../services/IntervalManager.js';
import { BundleOptimizer } from '../services/BundleOptimizer.js';
import { ProductionMonitor } from '../services/ProductionMonitor.js';
import { HealthCheckService } from '../services/HealthCheckService.js';
import { ErrorHandler, MemoryManager, showToast as utilShowToast, formatFileSize } from '../utils.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, STORAGE_KEYS, UI_IDS, APP_CONFIG, CHART_TYPES } from '../constants.js';

// Declare Tesseract for TypeScript since it's loaded via CDN
declare const Tesseract: any;
// Declare SpeechRecognition and related types for browsers that support them
declare var SpeechRecognition: any;
declare var webkitSpeechRecognition: any;
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}
interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
    length: number;
}
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}


export class AudioTranscriptionApp {
  private apiService: APIService;
  private chartManager: ChartManager;
  private audioRecorder: AudioRecorder;
  private performanceMonitor: PerformanceMonitor;
  private intervalManager: IntervalManager;
  private bundleOptimizer: BundleOptimizer;
  private productionMonitor: ProductionMonitor;
  private healthCheckService: HealthCheckService;
  private tabNavigator!: TabNavigator;
  private state: AppState;
  private currentTranscript: string = '';
  private transcriptBuffer: string = '';
  private isSampleData: boolean = false;
  private fullTranscription: string = '';
  private managedFiles: ManagedFile[] = [];
  private nextFileId: number = 1;

  private autoSaveInterval: number | null = null;
  private uiUpdateInterval: number | null = null;

  private elements: {
    recordButton?: HTMLButtonElement;
    transcriptionArea?: HTMLDivElement;
    polishedNoteArea?: HTMLDivElement;
    statusDisplay?: HTMLElement;
    chartContainer?: HTMLElement;
    apiKeyInput?: HTMLInputElement;
    notesContainer?: HTMLElement;
    exportButton?: HTMLButtonElement;
    fileDropZone?: HTMLElement;
    fileInput?: HTMLInputElement;
    uploadFilesBtn?: HTMLButtonElement;
    contentLibraryPanel?: HTMLElement;
    contentLibraryButton?: HTMLButtonElement;
    closeLibraryButton?: HTMLButtonElement;
    filesList?: HTMLElement;
    analyzeContentButton?: HTMLButtonElement;
    consolidatedTopicsDisplay?: HTMLElement;
    summarizeContentButton?: HTMLButtonElement;
    automatedSummaryDisplay?: HTMLElement;
    // Workflow Panel Elements
    workflowButton?: HTMLButtonElement;
    workflowPanel?: HTMLElement;
    closeWorkflowButton?: HTMLButtonElement;
    workflowsListContainer?: HTMLElement; // Container for workflow action buttons
  } = {};

  constructor() {
    this.apiService = new APIService();
    this.chartManager = new ChartManager();
    this.audioRecorder = new AudioRecorder();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.intervalManager = IntervalManager.getInstance();
    this.bundleOptimizer = BundleOptimizer.getInstance();
    this.productionMonitor = ProductionMonitor.getInstance();
    this.healthCheckService = HealthCheckService.getInstance();
    
    this.state = {
      isRecording: false,
      currentNote: null,
      notes: [],
      isProcessing: false,
      errors: [],
    };

    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      this.performanceMonitor.startMonitoring();
      await this.performInitialHealthCheck();
      this.registerLazyModules();
      await this.bundleOptimizer.loadCriticalModules();
      this.setupDOMReferences();
      this.setupEventListeners();
      this.setupTabNavigator();
      this.initTheme();
      await this.initializeAPIKey();
      this.setupAudioRecorder();
      this.loadExistingNotes();
      this.updateUI();
      if (this.state.currentNote) {
        this.fullTranscription = this.state.currentNote.polishedNote || this.state.currentNote.rawTranscription;
      } else if (this.currentTranscript) {
        this.fullTranscription = this.currentTranscript;
      }
      this.setupAutoSave();
      this.setupPeriodicUpdates();
      await this.testAPIConnection();
      this._renderManagedFiles();
      console.log('🎙️ Audio Transcription App initialized successfully');
    } catch (error) {
      this._handleOperationError(error, 'initializeApp', 'Initialization Error', 'Failed to initialize the application');
    }
  }

  private setupDOMReferences(): void {
    this.elements = {
      recordButton: document.getElementById('recordButton') as HTMLButtonElement,
      transcriptionArea: document.getElementById(UI_IDS.CONTENT_PANE_RAW) as HTMLDivElement,
      polishedNoteArea: document.getElementById(UI_IDS.CONTENT_PANE_POLISHED) as HTMLDivElement,
      statusDisplay: document.getElementById('recordingStatus') as HTMLElement,
      chartContainer: document.getElementById(UI_IDS.CHART_DISPLAY_AREA) as HTMLElement,
      apiKeyInput: document.getElementById(UI_IDS.API_KEY_INPUT) as HTMLInputElement,
      notesContainer: document.getElementById('notesContainer') as HTMLElement,
      exportButton: document.getElementById('confirmExport') as HTMLButtonElement,
      fileDropZone: document.getElementById(UI_IDS.FILE_DROP_ZONE) as HTMLElement,
      fileInput: document.getElementById(UI_IDS.FILE_INPUT) as HTMLInputElement,
      uploadFilesBtn: document.getElementById(UI_IDS.UPLOAD_FILES_BTN) as HTMLButtonElement,
      contentLibraryPanel: document.getElementById(UI_IDS.CONTENT_LIBRARY_PANEL) as HTMLElement,
      contentLibraryButton: document.getElementById(UI_IDS.CONTENT_LIBRARY_BUTTON) as HTMLButtonElement,
      closeLibraryButton: document.getElementById(UI_IDS.CLOSE_LIBRARY_BUTTON) as HTMLButtonElement,
      filesList: document.getElementById(UI_IDS.FILES_LIST) as HTMLElement,
      analyzeContentButton: document.getElementById(UI_IDS.ANALYZE_CONTENT_BUTTON) as HTMLButtonElement,
      consolidatedTopicsDisplay: document.getElementById(UI_IDS.CONSOLIDATED_TOPICS_DISPLAY) as HTMLElement,
      summarizeContentButton: document.getElementById(UI_IDS.SUMMARIZE_CONTENT_BUTTON) as HTMLButtonElement,
      automatedSummaryDisplay: document.getElementById(UI_IDS.AUTOMATED_SUMMARY_DISPLAY) as HTMLElement,
      // Workflow Panel Elements
      workflowButton: document.getElementById(UI_IDS.WORKFLOW_BUTTON) as HTMLButtonElement,
      workflowPanel: document.getElementById(UI_IDS.WORKFLOW_PANEL) as HTMLElement,
      closeWorkflowButton: document.getElementById(UI_IDS.CLOSE_WORKFLOW_BUTTON) as HTMLButtonElement,
      workflowsListContainer: document.getElementById(UI_IDS.WORKFLOWS_LIST_CONTAINER) as HTMLElement,
    };
    const coreRequiredElementIds = ['recordButton', UI_IDS.CONTENT_PANE_RAW, UI_IDS.CONTENT_PANE_POLISHED, UI_IDS.CHART_DISPLAY_AREA];
    for (const elementId of coreRequiredElementIds) {
        if (!document.getElementById(elementId)) {
             ErrorHandler.logError(`Core required element '${elementId}' not found in DOM. Some features may not work.`, 'setupDOMReferences');
        }
    }
  }

  private setupEventListeners(): void {
    this.elements.recordButton?.addEventListener('click', () => this.toggleRecording());
    this.elements.apiKeyInput?.addEventListener('change', (e) => {
      const apiKey = (e.target as HTMLInputElement).value;
      if (apiKey) {
        this.apiService.setApiKey(apiKey);
        this.testAPIConnection();
      }
    });

    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById(UI_IDS.SETTINGS_MODAL);
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');

    settingsButton?.addEventListener('click', () => {
      settingsModal?.style.setProperty('display', 'flex');
      const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (savedApiKey && this.elements.apiKeyInput) {
        this.elements.apiKeyInput.value = savedApiKey;
      }
    });

    closeSettingsModal?.addEventListener('click', () => settingsModal?.style.setProperty('display', 'none'));
    cancelSettings?.addEventListener('click', () => settingsModal?.style.setProperty('display', 'none'));

    saveSettings?.addEventListener('click', () => {
      if (this.elements.apiKeyInput && settingsModal) {
        const apiKey = this.elements.apiKeyInput.value;
        const rememberKey = (document.getElementById('rememberApiKey') as HTMLInputElement)?.checked;
        if (apiKey) {
          if (rememberKey) localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
          else localStorage.removeItem(STORAGE_KEYS.API_KEY);
          this.apiService.setApiKey(apiKey);
          this.testAPIConnection();
        }
        settingsModal.style.setProperty('display', 'none');
      }
    });

    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.style.setProperty('display', 'none');
    });

    document.getElementById('testChartButton')?.addEventListener('click', () => this.generateCharts());
    document.getElementById('sampleChartsButton')?.addEventListener('click', () => this.generateSampleCharts());
    document.getElementById('newButton')?.addEventListener('click', () => this.clearCurrentNote());
    this.elements.exportButton?.addEventListener('click', () => this.exportNotes());
    document.getElementById('performanceToggleButton')?.addEventListener('click', () => this.togglePerformanceIndicator());
    document.getElementById('themeToggleButton')?.addEventListener('click', () => this.toggleTheme());

    if (this.elements.analyzeContentButton) {
        this.elements.analyzeContentButton.addEventListener('click', async () => {
          const aggregatedText = this._aggregateAllTextContent();
          if (!aggregatedText || aggregatedText === "No text content available for aggregation.") {
            utilShowToast({type: 'warning', title: 'No Content', message: 'No text content available to analyze.'});
            return;
          }

          utilShowToast({type: 'info', title: 'Processing...', message: 'Analyzing content for consolidated topics.'});
          console.log("Aggregated Text for Topic Analysis:", aggregatedText.substring(0, 500) + "...");

          try {
            const response = await this.apiService.getConsolidatedTopics(aggregatedText);
            if (response.success && response.data) {
              console.log("Consolidated Topics:", response.data);
              this._displayConsolidatedTopics(response.data);
              utilShowToast({type: 'success', title: 'Analysis Complete', message: 'Consolidated topics generated.'});
            } else {
              this._handleOperationError(response.error || 'Failed to get consolidated topics', 'analyzeContentButton', 'Topic Analysis Failed', response.error || 'Unknown error from API');
            }
          } catch (error) {
             this._handleOperationError(error, 'analyzeContentButton', 'Topic Analysis Error', 'An unexpected error occurred during topic analysis.');
          }
        });
    }

    if (this.elements.summarizeContentButton) {
        this.elements.summarizeContentButton.addEventListener('click', async () => {
            const aggregatedText = this._aggregateAllTextContent();
            if (!aggregatedText || aggregatedText === "No text content available for aggregation.") {
                utilShowToast({type: 'warning', title: 'No Content', message: 'No text content available to summarize.'});
                return;
            }

            utilShowToast({type: 'info', title: 'Summarizing...', message: 'Generating automated summary.'});
            if (this.elements.automatedSummaryDisplay) {
                this.elements.automatedSummaryDisplay.style.display = 'none';
            }
            console.log("Aggregated Text for Summary:", aggregatedText.substring(0, 500) + "...");

            try {
                const response = await this.apiService.getAutomatedSummary(aggregatedText);
                if (response.success && response.data) {
                    console.log("Automated Summary:", response.data);
                    this._displayAutomatedSummary(response.data);
                    utilShowToast({type: 'success', title: 'Summary Generated', message: 'Automated summary created.'});
                } else {
                    this._handleOperationError(response.error || 'Failed to generate summary', 'summarizeContentButton', 'Summarization Failed', response.error || 'Unknown error from API');
                }
            } catch (error) {
                this._handleOperationError(error, 'summarizeContentButton', 'Summarization Error', 'An unexpected error occurred during summarization.');
            }
        });
    }

    window.addEventListener('beforeunload', () => this.cleanup());
    window.addEventListener('resize', this.handleResize);

    this._setupFileUploadListeners();
    this._setupContentLibraryPanelListeners();
    this._setupWorkflowPanelListeners(); // Setup for the new panel
  }

  private _setupContentLibraryPanelListeners(): void {
    if (this.elements.contentLibraryButton && this.elements.contentLibraryPanel) {
      this.elements.contentLibraryButton.addEventListener('click', () => {
        this.elements.contentLibraryPanel!.classList.toggle('open');
        if (this.elements.contentLibraryPanel!.classList.contains('open')) {
            this._renderManagedFiles();
        }
      });
    }
    if (this.elements.closeLibraryButton && this.elements.contentLibraryPanel) {
      this.elements.closeLibraryButton.addEventListener('click', () => {
        this.elements.contentLibraryPanel!.classList.remove('open');
      });
    }
  }

  private _setupWorkflowPanelListeners(): void {
    if (this.elements.workflowButton && this.elements.workflowPanel) {
      this.elements.workflowButton.addEventListener('click', () => {
        this.elements.workflowPanel!.classList.toggle('open');
      });
    }
    if (this.elements.closeWorkflowButton && this.elements.workflowPanel) {
      this.elements.closeWorkflowButton.addEventListener('click', () => {
        this.elements.workflowPanel!.classList.remove('open');
      });
    }
  }

  private _setupFileUploadListeners(): void {
    if (this.elements.fileDropZone) {
      this.elements.fileDropZone.style.display = 'flex';
      this.elements.fileDropZone.addEventListener('dragenter', (event) => {
        event.preventDefault(); this.elements.fileDropZone?.classList.add('drag-over'); console.log('Drag enter');
      });
      this.elements.fileDropZone.addEventListener('dragover', (event) => event.preventDefault());
      this.elements.fileDropZone.addEventListener('dragleave', (event) => {
        event.preventDefault(); this.elements.fileDropZone?.classList.remove('drag-over'); console.log('Drag leave');
      });
      this.elements.fileDropZone.addEventListener('drop', (event) => {
        event.preventDefault(); this.elements.fileDropZone?.classList.remove('drag-over');
        const droppedFiles = event.dataTransfer?.files;
        if (droppedFiles) this._handleSelectedFiles(droppedFiles);
        console.log('Files dropped');
      });
    } else console.warn(`Element with ID '${UI_IDS.FILE_DROP_ZONE}' not found.`);

    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (event) => {
        const selectedFiles = (event.target as HTMLInputElement).files;
        if (selectedFiles) this._handleSelectedFiles(selectedFiles);
        console.log('Files selected via input.');
      });
    } else console.warn(`Element with ID '${UI_IDS.FILE_INPUT}' not found.`);

    if (this.elements.uploadFilesBtn && this.elements.fileInput) {
      this.elements.uploadFilesBtn.addEventListener('click', () => {
        this.elements.fileInput?.click(); console.log('Upload button clicked.');
      });
    } else {
      if (!this.elements.uploadFilesBtn) console.warn(`Element with ID '${UI_IDS.UPLOAD_FILES_BTN}' not found.`);
      if (!this.elements.fileInput) console.warn(`Element with ID '${UI_IDS.FILE_INPUT}' not found (for upload button).`);
    }
  }

  private handleResize = () => this.chartManager.resizeAllCharts();

  private async initializeAPIKey(): Promise<void> {
    try {
      const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (savedApiKey) {
        console.log('🔑 Loading saved API key from localStorage');
        this.apiService.setApiKey(savedApiKey);
        if (this.elements.apiKeyInput) this.elements.apiKeyInput.value = savedApiKey;
        const rememberKeyCheckbox = document.getElementById('rememberApiKey') as HTMLInputElement;
        if (rememberKeyCheckbox) rememberKeyCheckbox.checked = true;
      } else console.log('⚠️ No API key found in localStorage - user will need to configure one');
    } catch (error) {
      ErrorHandler.logError('Failed to initialize API key', error);
    }
  }

  private setupAudioRecorder(): void {
    this.audioRecorder.onTranscriptAvailable((transcript) => {
      this.transcriptBuffer += transcript + ' ';
      this.fullTranscription = this.transcriptBuffer;
      this.updateTranscriptionArea();
    });
    this.audioRecorder.onRecordingStateChange((recordingState) => this.updateRecordingUI(recordingState));
  }

  private async toggleRecording(): Promise<void> {
    try {
      if (!this.audioRecorder.isSupported()) {
        utilShowToast({ type: 'error', title: 'Not Supported', message: ERROR_MESSAGES.MICROPHONE.NOT_SUPPORTED }); return;
      }
      if (this.state.isRecording) {
        this.audioRecorder.stopRecording();
        this.currentTranscript = this.transcriptBuffer.trim();
        this.fullTranscription = this.currentTranscript;
        this.state.isRecording = false;
        if (this.currentTranscript) utilShowToast({ type: 'success', title: 'Recording Complete', message: 'Transcription ready for polishing.' });
      } else {
        const success = await this.audioRecorder.startRecording();
        if (success) {
          this.state.isRecording = true; this.transcriptBuffer = ''; this.fullTranscription = '';
          utilShowToast({ type: 'info', title: 'Recording Started', message: 'Speak now...' });
        } else utilShowToast({ type: 'error', title: 'Recording Failed', message: ERROR_MESSAGES.MICROPHONE.GENERIC_ERROR });
      }
      this.updateUI();
    } catch (error) {
      this._handleOperationError(error, 'toggleRecording', 'Recording Error', 'An error occurred while toggling recording');
    }
  }

  private async polishCurrentTranscription(): Promise<void> {
    try {
      const textToPolish = this.fullTranscription || this.currentTranscript;
      if (!textToPolish) {
        utilShowToast({ type: 'warning', title: 'No Transcription', message: 'Please record or type something first.' }); return;
      }
      if (!this.apiService.hasValidApiKey()) {
        utilShowToast({ type: 'warning', title: 'API Key Required', message: ERROR_MESSAGES.API.API_KEY_MISSING }); return;
      }
      this.state.isProcessing = true; this.updateUI();
      const result = await this.performanceMonitor.measureOperation(() => this.apiService.polishTranscription(textToPolish), 'apiResponseTime', 'PolishTranscription');
      if (result.success && result.data) {
        this.state.currentNote = {
            id: this.state.currentNote?.id || Date.now().toString(),
            rawTranscription: textToPolish,
            polishedNote: result.data,
            timestamp: this.state.currentNote?.timestamp || Date.now()
        };
        this.fullTranscription = result.data;
        this.updatePolishedNoteArea();
        utilShowToast({ type: 'success', title: 'Polishing Complete', message: 'Your transcription has been improved.' });
      } else utilShowToast({ type: 'error', title: 'Polishing Failed', message: result.error || 'Unknown error occurred.' });
    } catch (error) {
      this._handleOperationError(error, 'polishCurrentTranscription', 'Processing Error', 'An error occurred while polishing the transcription');
    } finally {
      this.state.isProcessing = false; this.updateUI();
    }
  }

  private async generateCharts(): Promise<void> {
    if (this.isSampleData) {
      console.log("generateCharts called while isSampleData is true; AI chart generation skipped."); this.isSampleData = false; return;
    }
    console.log('Generating charts from AI...');
    this.state.isProcessing = true; this.updateUI();
    try {
      const textToAnalyze = this._aggregateAllTextContent();
      if (!textToAnalyze || textToAnalyze === "No text content available for aggregation.") {
        ErrorHandler.logWarning('No transcription data available to generate AI charts.', 'generateCharts');
        utilShowToast({ type: 'warning', title: 'Missing Data', message: 'No transcription or file data available for AI chart generation.' });
        this.state.isProcessing = false; this.updateUI(); return;
      }
      const chartDataResponse = await this.performanceMonitor.measureOperation(() => this.apiService.generateChartData(textToAnalyze, CHART_TYPES.ALL), 'apiResponseTime', 'generateChartData_AI');
      if (chartDataResponse.success && chartDataResponse.data) {
        if (typeof chartDataResponse.data === 'object' && (('topics' in chartDataResponse.data) || ('sentiment' in chartDataResponse.data) || ('wordFrequency' in chartDataResponse.data))) {
          this._renderCharts(chartDataResponse.data as AllAIChartData, 'ai');
        } else {
          ErrorHandler.logWarning('Received unexpected chart data format from AI. Expected AllAIChartData.', 'generateCharts');
          utilShowToast({ type: 'error', title: 'AI Chart Data Error', message: 'Unexpected chart data format from AI service.' });
        }
      } else {
        ErrorHandler.logError('Failed to fetch chart data from AI for generateCharts', chartDataResponse.error || 'Unknown API error');
        utilShowToast({ type: 'error', title: 'AI Chart Data Error', message: chartDataResponse.error || 'Could not retrieve chart data from AI.' });
      }
    } catch (error) {
      this._handleOperationError(error, 'generateChartsAI', 'Chart Generation Failed', 'An unexpected error occurred while generating AI charts');
    } finally {
      this.state.isProcessing = false; this.updateUI();
    }
  }

  private saveCurrentNote(): void {
    try {
      if (this.elements.polishedNoteArea?.textContent) {
          this.fullTranscription = this.elements.polishedNoteArea.textContent;
      } else if (this.elements.transcriptionArea?.textContent) {
          this.fullTranscription = this.elements.transcriptionArea.textContent;
      }

      if (!this.state.currentNote && !this.fullTranscription.trim()) {
        utilShowToast({ type: 'warning', title: 'No Note', message: 'There is no note to save.' }); return;
      }

      const noteToSave: StoredNote = this.state.currentNote ?
        { ...this.state.currentNote, polishedNote: this.fullTranscription, rawTranscription: this.state.currentNote.rawTranscription } :
        {
          id: Date.now().toString(),
          rawTranscription: this.currentTranscript,
          polishedNote: this.fullTranscription,
          timestamp: Date.now()
        };

      DataProcessor.saveNote(noteToSave);
      this.state.notes = DataProcessor.getAllNotes();
      this.state.currentNote = noteToSave;
      this.updateNotesDisplay();
      utilShowToast({ type: 'success', title: 'Note Saved', message: 'Your note has been saved successfully.' });
    } catch (error) {
      this._handleOperationError(error, 'saveCurrentNote', 'Save Failed', 'Failed to save the note');
    }
  }

  private clearCurrentNote(): void {
    this.currentTranscript = '';
    this.transcriptBuffer = '';
    this.fullTranscription = '';
    this.state.currentNote = null;
    if(this.elements.transcriptionArea) this.elements.transcriptionArea.textContent = '';
    if(this.elements.polishedNoteArea) this.elements.polishedNoteArea.textContent = '';
    this.chartManager.destroyAllCharts();
    if (this.elements.consolidatedTopicsDisplay) this.elements.consolidatedTopicsDisplay.innerHTML = '';
    if (this.elements.automatedSummaryDisplay) {
        this.elements.automatedSummaryDisplay.innerHTML = '';
        this.elements.automatedSummaryDisplay.style.display = 'none';
    }
    this.updateUI();
    utilShowToast({ type: 'info', title: 'Cleared', message: 'Current note and charts have been cleared.' });
  }

  private exportNotes(): void {
    try {
      const format = 'markdown'; const includeRaw = true;
      const exportData = DataProcessor.exportNotes(format, includeRaw);
      if (exportData) {
        const blob = new Blob([exportData], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `voice-notes-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        utilShowToast({ type: 'success', title: 'Export Complete', message: 'Notes have been exported successfully.' });
      }
    } catch (error) {
      this._handleOperationError(error, 'exportNotes', 'Export Failed', 'Failed to export notes');
    }
  }

  private async testAPIConnection(): Promise<void> {
    try {
      const result = await this.apiService.testConnection();
      if (result.success) {
        utilShowToast({ type: 'success', title: 'API Connected', message: 'Gemini API connection successful.', duration: 3000 });
      } else {
        if (result.error?.includes(ERROR_MESSAGES.API.API_KEY_MISSING)) console.log('ℹ️ No API key configured - user can set one in settings');
        else utilShowToast({ type: 'error', title: 'API Connection Failed', message: result.error || 'Unknown error' });
      }
    } catch (error) {
      ErrorHandler.logError('API connection test failed', error);
    }
  }

  private loadExistingNotes(): void {
      this.state.notes = DataProcessor.getAllNotes();
      if (this.state.notes.length > 0) {
      }
      this.updateNotesDisplay();
  }
  private updateTranscriptionArea(): void {
      if (this.elements.transcriptionArea) this.elements.transcriptionArea.textContent = this.transcriptBuffer;
      if (!this.elements.polishedNoteArea?.textContent?.trim()) {
          this.fullTranscription = this.transcriptBuffer;
      }
  }
  private updatePolishedNoteArea(): void {
      if (this.elements.polishedNoteArea && this.state.currentNote) {
          this.elements.polishedNoteArea.textContent = this.state.currentNote.polishedNote;
          this.fullTranscription = this.state.currentNote.polishedNote;
      }
  }

  private updateRecordingUI(recordingState: RecordingState): void {
    if (this.elements.recordButton) {
      this.elements.recordButton.textContent = recordingState.isRecording ? (recordingState.isPaused ? 'Resume' : 'Stop Recording') : 'Start Recording';
      this.elements.recordButton.className = recordingState.isRecording ? 'button-stop' : 'button-record';
    }
    if (this.elements.statusDisplay) {
      this.elements.statusDisplay.textContent = recordingState.isRecording ? `${recordingState.isPaused ? 'Paused' : 'Recording'} - ${this.audioRecorder.formatDuration(recordingState.duration)}` : 'Ready';
    }
  }

  private updateNotesDisplay(): void {
    if (!this.elements.notesContainer) return;
    this.elements.notesContainer.innerHTML = '';
    this.state.notes.forEach(note => {
      const noteElement = this.createNoteElement(note);
      this.elements.notesContainer!.appendChild(noteElement);
    });
    this._renderManagedFiles();
  }

  private createNoteElement(note: StoredNote): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.innerHTML = `
      <div class="note-header"><h3>${note.title || 'Untitled Note'}</h3><span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span></div>
      <div class="note-content">${(note.polishedNote || note.rawTranscription || '').substring(0, 200)}...</div>
      <div class="note-actions"><button data-note-id="${note.id}" class="load-note-btn">Load</button><button data-note-id="${note.id}" class="delete-note-btn">Delete</button></div>`;

    noteDiv.querySelector('.load-note-btn')?.addEventListener('click', () => this.loadNote(note.id));
    noteDiv.querySelector('.delete-note-btn')?.addEventListener('click', () => this.deleteNote(note.id));
    return noteDiv;
  }

  private updateUI(): void {
    if (this.elements.recordButton) this.elements.recordButton.disabled = this.state.isProcessing;
    document.querySelectorAll('.processing-indicator').forEach(el => (el as HTMLElement).style.display = this.state.isProcessing ? 'block' : 'none');
    if (this.elements.polishedNoteArea) {
        this.elements.polishedNoteArea.textContent = this.state.currentNote?.polishedNote || this.fullTranscription || '';
    }
    if (this.elements.transcriptionArea) {
        this.elements.transcriptionArea.textContent = this.state.currentNote?.rawTranscription || this.currentTranscript || '';
    }
  }

  private cleanup(): void {
    console.log('🧹 Starting application cleanup...');
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval); this.autoSaveInterval = null;
    if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval); this.uiUpdateInterval = null;
    this.performanceMonitor.cleanup(); this.intervalManager.cleanup(); this.bundleOptimizer.cleanup();
    this.audioRecorder.cleanup(); this.chartManager.destroyAllCharts(); MemoryManager.cleanup();
    window.removeEventListener('resize', this.handleResize);
    console.log('✅ Application cleanup completed');
  }

  private registerLazyModules(): void {
    this.bundleOptimizer.registerLazyModule('charting', async () => ({ Chart: (await import('chart.js')).Chart }));
    this.bundleOptimizer.registerLazyModule('fileProcessing', async () => {
      const [m, t, p] = await Promise.all([import('mammoth'), import('tesseract.js'), import('pdfjs-dist')]);
      return { mammoth: m, tesseract: t, pdfjsLib: p };
    });
    this.bundleOptimizer.registerLazyModule('advancedFeatures', async () => ({}));
  }

  private setupAutoSave(): void {
    this.autoSaveInterval = this.intervalManager.createRecurringTask('AutoSave', APP_CONFIG.TIMING.AUTO_SAVE_INTERVAL, () => {
      if (this.elements.polishedNoteArea?.textContent && this.elements.polishedNoteArea.textContent.trim() !== '') {
          this.fullTranscription = this.elements.polishedNoteArea.textContent;
      } else if (this.elements.transcriptionArea?.textContent && this.elements.transcriptionArea.textContent.trim() !== '') {
          this.fullTranscription = this.elements.transcriptionArea.textContent;
      }

      if (this.fullTranscription.trim() && !this.state.isProcessing) {
        const noteToSave: StoredNote = this.state.currentNote ?
            { ...this.state.currentNote, polishedNote: this.fullTranscription, rawTranscription: this.state.currentNote.rawTranscription || this.currentTranscript } :
            {
                id: Date.now().toString(),
                rawTranscription: this.currentTranscript,
                polishedNote: this.fullTranscription,
                timestamp: Date.now()
            };
        this.performanceMonitor.measureOperation(() => DataProcessor.saveNote(noteToSave), 'renderTime', 'AutoSave');
        this.state.currentNote = noteToSave;
      }
    }, { onError: (error) => console.warn('Auto-save failed:', error) });
  }

  private setupPeriodicUpdates(): void {
    this.uiUpdateInterval = this.intervalManager.createRecurringTask('UIUpdate', APP_CONFIG.TIMING.UI_UPDATE_INTERVAL, () => this.updatePerformanceUI());
  }

  private updatePerformanceUI(): void {
    const pIndicator = document.getElementById('performanceIndicator');
    if (!pIndicator || pIndicator.style.display === 'none') return;
    const metrics = this.performanceMonitor.getLatestMetrics();
    const alerts = this.performanceMonitor.getAlerts();
    if (metrics) {
      const memEl = document.getElementById('memoryUsage'); if (memEl) memEl.textContent = `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`;
      const cpuEl = document.getElementById('cpuUsage');
      if (cpuEl) {
        const ops = this.performanceMonitor.getRecentOperations();
        const avgDur = ops.length > 0 ? ops.reduce((s, op) => s + op.duration, 0) / ops.length : 0;
        cpuEl.textContent = `${Math.min(100, Math.round(avgDur / 10))}%`;
      }
      const fpsEl = document.getElementById('frameRate'); if (fpsEl) fpsEl.textContent = `${Math.round(metrics.frameRate)}`;
      const alertEl = document.getElementById('performanceAlert'); const alertTxtEl = document.getElementById('performanceAlertText');
      const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
      if (critAlerts.length > 0 && alertEl && alertTxtEl) {
        alertTxtEl.textContent = critAlerts[critAlerts.length - 1].message; alertEl.style.display = 'flex';
      } else if (alertEl) alertEl.style.display = 'none';
    }
  }

  private togglePerformanceIndicator(): void {
    const pIndicator = document.getElementById('performanceIndicator');
    const pToggleBtn = document.getElementById('performanceToggleButton');
    if (pIndicator && pToggleBtn) {
      const isVisible = pIndicator.style.display !== 'none';
      pIndicator.style.display = isVisible ? 'none' : 'block';
      pToggleBtn.classList.toggle('active', !isVisible);
      if (!isVisible) this.updatePerformanceUI();
    }
  }

  public loadNote(noteId: string): void {
    const note = DataProcessor.getNoteById(noteId);
    if (note) {
      this.state.currentNote = note;
      this.currentTranscript = note.rawTranscription || '';
      this.fullTranscription = note.polishedNote || note.rawTranscription || '';
      this.transcriptBuffer = this.currentTranscript;
      this.updateUI();
      utilShowToast({type: 'info', title: 'Note Loaded', message: `Loaded note: ${note.title || note.id}`});
    } else {
      utilShowToast({type: 'error', title: 'Load Error', message: `Could not load note ID: ${noteId}`});
    }
  }

  public deleteNote(noteId: string): void {
    if (DataProcessor.deleteNote(noteId)) {
      this.state.notes = DataProcessor.getAllNotes();
      if (this.state.currentNote && this.state.currentNote.id === noteId) {
        this.clearCurrentNote();
      }
      this.updateNotesDisplay();
      utilShowToast({ type: 'success', title: 'Note Deleted', message: 'The note has been deleted.' });
    }
  }

  private async performInitialHealthCheck(): Promise<void> {
    try {
      console.log('🏥 Performing initial health check...');
      const healthStatus = await this.healthCheckService.getHealthStatus();
      if (healthStatus.status === 'unhealthy') {
        console.warn('⚠️ Health check detected issues:', healthStatus);
        utilShowToast({ type: 'warning', title: 'System Health Warning', message: 'Some system checks failed. The app may not function optimally.' });
      } else if (healthStatus.status === 'warning') {
        console.warn('⚠️ Health check warnings:', healthStatus);
      } else console.log('✅ Health check passed - all systems operational');
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('health_check', {
          status: healthStatus.status, checks: Object.keys(healthStatus.checks).length,
          failedChecks: Object.values(healthStatus.checks).filter(c => c.status === 'fail').length
        });
      }
    } catch (error) {
      this._handleOperationError(error, 'performInitialHealthCheck', 'Health Check Failed', 'Unable to verify system health. Some features may be unavailable.');
    }
  }

  public async getHealthStatus() { return await this.healthCheckService.getHealthStatus(); }

  private async generateSampleCharts(): Promise<void> {
    this.isSampleData = true; console.log('Generating sample charts...');
    this.state.isProcessing = true; this.updateUI();
    try {
      const chartDataResponse = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateSampleChartData(), 'apiResponseTime', 'generateSampleChartData'
      );
      if (chartDataResponse.success && chartDataResponse.data) {
        this._renderCharts(chartDataResponse.data, 'sample');
        console.log('Sample charts generated and rendered successfully.');
      } else {
        ErrorHandler.logError('Failed to fetch sample chart data', chartDataResponse.error || 'Unknown API error');
        utilShowToast({ type: 'error', title: 'Sample Chart Data Error', message: chartDataResponse.error || 'Could not retrieve sample chart data.' });
      }
    } catch (error) {
      this._handleOperationError(error, 'generateSampleCharts', 'Chart Generation Failed', 'Failed to generate sample charts');
      if (this.productionMonitor) this.productionMonitor.trackError('sample_charts_generation_failed', error);
    } finally {
      this.state.isProcessing = false; this.updateUI();
    }
  }

  private setupTabNavigator(): void {
    const tabOptions = {
      tabNavigationContainerSelector: '.tab-navigation',
      tabButtonSelector: '.tab-button',
      activeTabIndicatorSelector: '.active-tab-indicator',
      initialTabId: UI_IDS.CONTENT_PANE_RAW
    };
    this.tabNavigator = new TabNavigator(tabOptions, (tabId: string) => this.handleTabSwitch(tabId), this.productionMonitor );
    const activeTabButton = document.querySelector(`${tabOptions.tabButtonSelector}.active`) as HTMLButtonElement;
    let initialTabToDisplay = tabOptions.initialTabId;
    if (activeTabButton && activeTabButton.dataset.tab) {
        initialTabToDisplay = activeTabButton.dataset.tab === UI_IDS.TAB_NOTE ? UI_IDS.CONTENT_PANE_POLISHED : UI_IDS.CONTENT_PANE_RAW;
    } else {
         const firstButton = document.querySelector(tabOptions.tabButtonSelector) as HTMLButtonElement;
         if(firstButton && firstButton.dataset.tab) {
             initialTabToDisplay = firstButton.dataset.tab === UI_IDS.TAB_NOTE ? UI_IDS.CONTENT_PANE_POLISHED : UI_IDS.CONTENT_PANE_RAW;
         }
    }
    this.handleTabSwitch(initialTabToDisplay, true);
  }

  private handleTabSwitch(tabId: string, isInitialSetup: boolean = false): void {
    const polishedNotePane = document.getElementById(UI_IDS.CONTENT_PANE_POLISHED);
    const rawTranscriptionPane = document.getElementById(UI_IDS.CONTENT_PANE_RAW);
    let targetContentId = '';
    if (tabId === UI_IDS.TAB_NOTE) {
        targetContentId = UI_IDS.CONTENT_PANE_POLISHED;
    } else if (tabId === UI_IDS.TAB_RAW) {
        targetContentId = UI_IDS.CONTENT_PANE_RAW;
    } else {
        targetContentId = tabId;
    }

    if (targetContentId === UI_IDS.CONTENT_PANE_POLISHED) {
      polishedNotePane?.classList.add('active');
      polishedNotePane?.style.setProperty('display', 'block');
      rawTranscriptionPane?.classList.remove('active');
      rawTranscriptionPane?.style.setProperty('display', 'none');
    } else if (targetContentId === UI_IDS.CONTENT_PANE_RAW) {
      rawTranscriptionPane?.classList.add('active');
      rawTranscriptionPane?.style.setProperty('display', 'block');
      polishedNotePane?.classList.remove('active');
      polishedNotePane?.style.setProperty('display', 'none');
    } else {
      console.warn(`Unknown tabId or content target: ${tabId}`);
      return;
    }
    if(!isInitialSetup) {
        console.log(`App handled switch to tab content for: ${targetContentId}`);
    }
  }

  private initTheme(): void {
    console.log('Initializing theme system...');
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
      const themeToggleButton = document.getElementById('themeToggleButton');
      if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i');
        if (icon) icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
      }
      console.log(`Theme initialized: ${savedTheme}`);
    } catch (error) {
      this._handleOperationError(error, 'initTheme', 'Theme Error', 'Failed to initialize theme system');
      document.body.className = '';
    }
  }

  private toggleTheme(): void {
    console.log('Toggling theme...');
    try {
      const isLightMode = document.body.classList.contains('light-mode');
      const newTheme = isLightMode ? 'dark' : 'light';
      if (isLightMode) document.body.classList.remove('light-mode');
      else document.body.classList.add('light-mode');
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      const themeToggleButton = document.getElementById('themeToggleButton');
      if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i');
        if (icon) icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
      }
      utilShowToast({ type: 'success', title: 'Theme Changed', message: `Switched to ${newTheme} mode`});
      console.log(`Theme toggled to: ${newTheme}`);
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('theme_toggled', { theme: newTheme, timestamp: Date.now() });
      }
    } catch (error) {
      this._handleOperationError(error, 'toggleTheme', 'Theme Error', 'Failed to change theme');
    }
  }

  private async _handleSelectedFiles(files: FileList): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    const fileProcessingPromises: Promise<ManagedFile>[] = [];
    const newlyAddedFileNames: string[] = [];

    for (const file of fileArray) {
      const fileId = `file-${this.nextFileId++}`;
      let managedFile: ManagedFile = {
        id: fileId,
        fileObject: file,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      };
      newlyAddedFileNames.push(file.name);

      if (file.type === 'text/plain') {
        const promise = new Promise<ManagedFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            managedFile.textContent = e.target?.result as string;
            resolve(managedFile);
          };
          reader.onerror = (e) => {
            ErrorHandler.logError(`Error reading file ${managedFile.name}`, e);
            resolve(managedFile);
          };
          reader.readAsText(file);
        });
        fileProcessingPromises.push(promise);
      } else if (file.type.startsWith('image/')) {
        const promise = new Promise<ManagedFile>((resolve) => {
          console.log(`Starting OCR for image: ${managedFile.name}`);
          Tesseract.recognize(
            managedFile.fileObject,
            'eng',
            { logger: (m: any) => console.log(m) }
          ).then(({ data: { text } }: { data: { text: string } }) => {
            managedFile.textContent = text;
            console.log(`OCR complete for ${managedFile.name}:`, text.substring(0, 100) + "...");
            resolve(managedFile);
          }).catch((err: any) => {
            ErrorHandler.logError(`OCR failed for ${managedFile.name}`, err);
            resolve(managedFile);
          });
        });
        fileProcessingPromises.push(promise);
      } else if (file.type.startsWith('audio/')) {
        console.log(`Attempting client-side transcription for audio file: ${managedFile.name}`);
        const promise = new Promise<ManagedFile>(async (resolve) => {
            ErrorHandler.logWarning(`Client-side transcription for audio file '${managedFile.name}' via SpeechRecognition API from buffer is not directly supported. This would typically require a server-side API or a specialized client-side library.`, '_handleSelectedFiles - audio');
            managedFile.textContent = 'Client-side audio file transcription not directly supported by browser SpeechRecognition.';
            resolve(managedFile);
        });
        fileProcessingPromises.push(promise);
      }
       else {
        fileProcessingPromises.push(Promise.resolve(managedFile));
      }
    }

    try {
      const processedFiles = await Promise.all(fileProcessingPromises);
      this.managedFiles.push(...processedFiles);

      console.log('Managed files after processing:', this.managedFiles.map(f => ({name: f.name, type: f.type, textContentPresent: !!f.textContent, textContent: f.textContent?.substring(0,30)})));

      utilShowToast({
          type: 'success',
          title: 'Files Added',
          message: `Added: ${newlyAddedFileNames.join(', ')} (${processedFiles.length} processed)`
      });
    } catch (error) {
      ErrorHandler.logError('Error processing one or more files during Promise.all.', error);
      utilShowToast({
        type: 'error',
        title: 'File Processing Error',
        message: 'Some files could not be processed.',
      });
    }

    this._renderManagedFiles();
  }

  public removeManagedFileById(fileId: string): void {
    const initialCount = this.managedFiles.length;
    this.managedFiles = this.managedFiles.filter(mf => mf.id !== fileId);
    if (this.managedFiles.length < initialCount) {
      console.log(`Removed file with ID: ${fileId}. Updated managed files:`, this.managedFiles);
      utilShowToast({type: 'info', title: 'File Removed', message: `File removed.`});
    } else {
      console.warn(`File with ID: ${fileId} not found for removal.`);
      utilShowToast({type: 'warning', title: 'Removal Failed', message: `File not found.`});
    }
    this._renderManagedFiles();
  }

  public getManagedFiles(): ManagedFile[] {
    return [...this.managedFiles];
  }

  private _handleOperationError(error: unknown, operationName: string, userFriendlyTitle: string, userFriendlyMessagePrefix: string): void {
    ErrorHandler.logError(`${userFriendlyMessagePrefix} (${operationName}) failed`, error);
    let message = `${userFriendlyMessagePrefix}.`;
    if (error instanceof Error && error.message) {
      const lowerMessage = error.message.toLowerCase();
      if (!lowerMessage.includes('unknown error') && !lowerMessage.includes('typeerror') && !lowerMessage.includes('failed to fetch')) {
        message += ` Details: ${error.message}`;
      }
    }
    utilShowToast({ type: 'error', title: userFriendlyTitle, message: message });
  }

  private _renderCharts(chartData: AllAIChartData, context: string): void {
    if (!chartData) {
      ErrorHandler.logWarning(`No chart data provided for context: ${context}`, '_renderCharts');
      return;
    }
    const chartDisplayArea = document.getElementById(UI_IDS.CHART_DISPLAY_AREA);
    if (chartDisplayArea) {
        chartDisplayArea.innerHTML = '';
    } else {
        ErrorHandler.logError(`'${UI_IDS.CHART_DISPLAY_AREA}' not found for rendering charts.`, '_renderCharts');
        return;
    }

    if (chartData.topics) {
      const chartId = `${CHART_TYPES.TOPICS}Chart-${context}`;
      const title = this.getChartTitle(CHART_TYPES.TOPICS);
      this.createChartContainer(chartId, title, this.getChartDescription(CHART_TYPES.TOPICS));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createTopicChart(chartId, chartData.topics as TopicDataInput, title),
        'chartRenderTime', `createChart_${CHART_TYPES.TOPICS}_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering topics chart for ${context}`, err));
    }

    if (chartData.sentiment) {
      const chartId = `${CHART_TYPES.SENTIMENT}Chart-${context}`;
      const title = this.getChartTitle(CHART_TYPES.SENTIMENT);
      this.createChartContainer(chartId, title, this.getChartDescription(CHART_TYPES.SENTIMENT));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createSentimentChart(chartId, chartData.sentiment as SentimentDataInput, title),
        'chartRenderTime', `createChart_${CHART_TYPES.SENTIMENT}_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering sentiment chart for ${context}`, err));
    }

    if (chartData.wordFrequency) {
      const chartId = `${CHART_TYPES.WORD_FREQUENCY}Chart-${context}`;
      const title = this.getChartTitle(CHART_TYPES.WORD_FREQUENCY);
      this.createChartContainer(chartId, title, this.getChartDescription(CHART_TYPES.WORD_FREQUENCY));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createWordFrequencyChart(chartId, chartData.wordFrequency as WordFrequencyInput, title),
        'chartRenderTime', `createChart_${CHART_TYPES.WORD_FREQUENCY}_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering wordFrequency chart for ${context}`, err));
    }
  }

  private _getFileTypeInfo(fileType: string): { iconText: string, typeClass: string } {
    if (fileType.startsWith('image/')) return { iconText: '[IMG]', typeClass: 'img' };
    if (fileType.startsWith('audio/')) return { iconText: '[AUD]', typeClass: 'audio' };
    if (fileType === 'application/pdf') return { iconText: '[PDF]', typeClass: 'pdf' };
    if (fileType.includes('word')) return { iconText: '[DOC]', typeClass: 'doc' };
    if (fileType === 'text/plain') return { iconText: '[TXT]', typeClass: 'txt' };
    return { iconText: '[FILE]', typeClass: 'default' };
  }

  private _renderManagedFiles(): void {
    if (!this.elements.filesList) {
      ErrorHandler.logError("Files list element (UI_IDS.FILES_LIST) not found for rendering.", '_renderManagedFiles');
      return;
    }
    this.elements.filesList.innerHTML = '';

    const emptyStateDiv = document.getElementById('filesEmptyState');

    if (this.managedFiles.length === 0) {
      if (emptyStateDiv) {
        (emptyStateDiv as HTMLElement).style.display = 'flex';
      } else {
        const p = document.createElement('p');
        p.textContent = 'No files uploaded yet. Drag & drop or use the upload button.';
        p.className = 'files-empty-state-text';
        this.elements.filesList.appendChild(p);
      }
      return;
    }

    if (emptyStateDiv) {
      (emptyStateDiv as HTMLElement).style.display = 'none';
    }

    this.managedFiles.forEach(managedFile => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'file-item';

      const { iconText, typeClass } = this._getFileTypeInfo(managedFile.type);
      let faIconClass = 'fa-file-alt';
      if (typeClass === 'img') faIconClass = 'fa-file-image';
      else if (typeClass === 'audio') faIconClass = 'fa-file-audio';
      else if (typeClass === 'pdf') faIconClass = 'fa-file-pdf';
      else if (typeClass === 'doc') faIconClass = 'fa-file-word';
      else if (typeClass === 'txt') faIconClass = 'fa-file-alt';

      itemDiv.innerHTML = `
        <div class="file-icon ${typeClass}">
          <i class="fas ${faIconClass}"></i> ${iconText}
        </div>
        <div class="file-info">
          <div class="file-name">${managedFile.name}</div>
          <div class="file-meta">
            <span>${formatFileSize(managedFile.size)}</span> | <span>${managedFile.type || 'unknown'}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="file-action-btn remove-file-btn" data-file-id="${managedFile.id}" title="Remove file">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      this.elements.filesList!.appendChild(itemDiv);
    });

    this.elements.filesList.querySelectorAll('.remove-file-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const targetButton = event.currentTarget as HTMLButtonElement;
        const fileId = targetButton.dataset.fileId || targetButton.getAttribute('data-file-id');
        if (fileId) {
          this.removeManagedFileById(fileId);
        }
      });
    });
  }

  private createChartContainer(canvasId: string, title: string, description: string): void {
    const chartDisplayArea = document.getElementById(UI_IDS.CHART_DISPLAY_AREA);
    if (!chartDisplayArea) {
      ErrorHandler.logError(`Chart display area '${UI_IDS.CHART_DISPLAY_AREA}' not found for canvasId: ${canvasId}`, 'createChartContainer');
      return;
    }
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>${title}</h4>
        <p class="chart-description">${description}</p>
      </div>
      <canvas id="${canvasId}"></canvas>
    `;
    chartDisplayArea.appendChild(chartContainer);
  }

  private getChartTitle(chartType: string): string {
    switch (chartType) {
      case CHART_TYPES.TOPICS: return 'Topic Distribution';
      case CHART_TYPES.SENTIMENT: return 'Sentiment Analysis';
      case CHART_TYPES.WORD_FREQUENCY: return 'Word Frequency';
      default: return 'Chart';
    }
  }

  private getChartDescription(chartType: string): string {
    switch (chartType) {
      case CHART_TYPES.TOPICS: return 'Main topics identified in your transcription';
      case CHART_TYPES.SENTIMENT: return 'Emotional tone breakdown of your content';
      case CHART_TYPES.WORD_FREQUENCY: return 'Most frequently used words in your transcription';
      default: return 'Data visualization';
    }
  }

  private _aggregateAllTextContent(): string {
    const allTextParts: string[] = [];
    const placeholderAudioMessage = "Client-side audio file transcription not directly supported by browser SpeechRecognition.";

    let mainNoteText = "";
    if (this.elements.polishedNoteArea && this.elements.polishedNoteArea.textContent && this.elements.polishedNoteArea.textContent.trim() !== '') {
        mainNoteText = this.elements.polishedNoteArea.textContent.trim();
    } else if (this.elements.transcriptionArea && this.elements.transcriptionArea.textContent && this.elements.transcriptionArea.textContent.trim() !== '') {
        mainNoteText = this.elements.transcriptionArea.textContent.trim();
    } else if (this.fullTranscription && this.fullTranscription.trim() !== '') {
        mainNoteText = this.fullTranscription.trim();
    } else if (this.currentTranscript && this.currentTranscript.trim() !== '') {
        mainNoteText = this.currentTranscript.trim();
    }

    if (mainNoteText) {
      allTextParts.push("== Main Note Transcription ==\n" + mainNoteText);
    }

    for (const managedFile of this.managedFiles) {
      if (managedFile.textContent &&
          managedFile.textContent.trim() !== '' &&
          managedFile.textContent !== placeholderAudioMessage) {
        allTextParts.push(`== Content from file: ${managedFile.name} ==\n${managedFile.textContent}`);
      }
    }

    if (allTextParts.length === 0) {
      return "No text content available for aggregation.";
    }
    return allTextParts.join('\n\n');
  }

  private _displayConsolidatedTopics(topics: string[]): void {
    if (!this.elements.consolidatedTopicsDisplay) {
      ErrorHandler.logError("Consolidated topics display area not found.", "_displayConsolidatedTopics");
      return;
    }
    this.elements.consolidatedTopicsDisplay.style.display = 'block';
    if (topics.length === 0) {
      this.elements.consolidatedTopicsDisplay.innerHTML = "<p>No specific topics identified.</p>";
      return;
    }
    const listItems = topics.map(topic => `<li>${topic}</li>`).join('');
    this.elements.consolidatedTopicsDisplay.innerHTML = `<h3>Consolidated Topics:</h3><ul>${listItems}</ul>`;
  }

  private _displayAutomatedSummary(summary: string): void {
    if (!this.elements.automatedSummaryDisplay) {
        ErrorHandler.logError("Automated summary display area not found.", "_displayAutomatedSummary");
        return;
    }
    this.elements.automatedSummaryDisplay.innerHTML = `<h3>Automated Summary:</h3><p>${summary}</p>`;
    this.elements.automatedSummaryDisplay.style.display = 'block';
  }
}
