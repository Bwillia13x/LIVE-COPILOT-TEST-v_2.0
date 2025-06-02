/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, AppState, ToastOptions, ErrorContext } from '../types/index.js';
import { APIService } from '../services/APIService.js';
import { ChartManager } from '../services/ChartManager.js';
import { DataProcessor } from '../services/DataProcessor.js';
import { AudioRecorder, RecordingState } from '../services/AudioRecorder.js';
import { PerformanceMonitor } from '../services/PerformanceMonitor.js';
import { IntervalManager } from '../services/IntervalManager.js';
import { BundleOptimizer } from '../services/BundleOptimizer.js';
import { ProductionMonitor } from '../services/ProductionMonitor.js';
import { HealthCheckService } from '../services/HealthCheckService.js';
import { ErrorHandler, MemoryManager } from '../utils.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants.js';

export class AudioTranscriptionApp {
  private apiService: APIService;
  private chartManager: ChartManager;
  private audioRecorder: AudioRecorder;
  private performanceMonitor: PerformanceMonitor;
  private intervalManager: IntervalManager;
  private bundleOptimizer: BundleOptimizer;
  private productionMonitor: ProductionMonitor;
  private healthCheckService: HealthCheckService;
  private state: AppState;
  private currentTranscript: string = '';
  private transcriptBuffer: string = '';
  // private isSampleData: boolean = false; // Removed as per subtask

  // Performance tracking
  private autoSaveInterval: number | null = null;
  private uiUpdateInterval: number | null = null;

  // DOM element references
  private elements: {
    recordButton?: HTMLButtonElement;
    transcriptionArea?: HTMLDivElement;
    polishedNoteArea?: HTMLDivElement;
    statusDisplay?: HTMLElement;
    chartContainer?: HTMLElement;
    apiKeyInput?: HTMLInputElement;
    notesContainer?: HTMLElement;
    exportButton?: HTMLButtonElement;
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
      // Start performance monitoring
      this.performanceMonitor.startMonitoring();
      
      // Perform initial health check
      await this.performInitialHealthCheck();
      
      // Register lazy modules for optimal loading
      this.registerLazyModules();
      
      // Load critical modules first
      await this.bundleOptimizer.loadCriticalModules();
      
      this.setupDOMReferences();
      this.setupEventListeners();
      
      // Initialize theme system
      this.initTheme();
      
      // Initialize API key from localStorage
      await this.initializeAPIKey();
      
      this.setupAudioRecorder();
      this.loadExistingNotes();
      this.updateUI();
      
      // Set up auto-save functionality
      this.setupAutoSave();
      
      // Set up periodic UI updates
      this.setupPeriodicUpdates();
      
      // Test API connection if API key is available
      await this.testAPIConnection();

      // Show initial warning if API service has issues after setup
      if (this.apiService.initializationError) {
        this.showToast({
          type: 'warning',
          title: 'API Service Not Ready',
          message: `Error: ${this.apiService.initializationError}. Please check your API key in Settings.`,
          duration: 7000, // Longer duration for initial warnings
        });
      }
      
      console.log('🎙️ Audio Transcription App initialized successfully');
    } catch (error) {
      ErrorHandler.logError('Failed to initialize app', error);
      this.showToast({
        type: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize the application. Please refresh the page.',
      });
    }
  }

  private setupDOMReferences(): void {
    this.elements = {
      recordButton: document.getElementById('recordButton') as HTMLButtonElement,
      transcriptionArea: document.getElementById('rawTranscription') as HTMLDivElement,
      polishedNoteArea: document.getElementById('polishedNote') as HTMLDivElement,
      statusDisplay: document.getElementById('recordingStatus') as HTMLElement,
      chartContainer: document.getElementById('aiChartDisplayArea') as HTMLElement,
      apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement,
      notesContainer: document.getElementById('notesContainer') as HTMLElement,
      exportButton: document.getElementById('confirmExport') as HTMLButtonElement,
    };

    // Validate that required elements exist
    const requiredElements = ['recordButton', 'transcriptionArea', 'polishedNoteArea'];
    for (const elementName of requiredElements) {
      if (!this.elements[elementName as keyof typeof this.elements]) {
        throw new Error(`Required element '${elementName}' not found in DOM`);
      }
    }
  }

  private setupEventListeners(): void {
    // Record button
    this.elements.recordButton?.addEventListener('click', () => {
      this.toggleRecording();
    });

    // API Key input
    this.elements.apiKeyInput?.addEventListener('change', (e) => {
      const apiKey = (e.target as HTMLInputElement).value;
      if (apiKey) {
        this.apiService.setApiKey(apiKey);
        this.testAPIConnection();
      }
    });

    // Settings modal
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');

    settingsButton?.addEventListener('click', () => {
      settingsModal?.style.setProperty('display', 'flex');
      // Load current API key if saved
      const savedApiKey = localStorage.getItem('geminiApiKey');
      if (savedApiKey && this.elements.apiKeyInput) {
        this.elements.apiKeyInput.value = savedApiKey;
      }
    });

    closeSettingsModal?.addEventListener('click', () => {
      settingsModal?.style.setProperty('display', 'none');
    });

    cancelSettings?.addEventListener('click', () => {
      settingsModal?.style.setProperty('display', 'none');
    });

    saveSettings?.addEventListener('click', () => {
      if (this.elements.apiKeyInput) {
        const apiKey = this.elements.apiKeyInput.value;
        const rememberKey = (document.getElementById('rememberApiKey') as HTMLInputElement)?.checked;
        
        if (apiKey) {
          if (rememberKey) {
            localStorage.setItem('geminiApiKey', apiKey);
          } else {
            localStorage.removeItem('geminiApiKey');
          }
          this.apiService.setApiKey(apiKey);
          this.testAPIConnection();
        }
        settingsModal?.style.setProperty('display', 'none');
      }
    });

    // Close modal when clicking outside
    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal?.style.setProperty('display', 'none');
      }
    });

    // New/Clear button (replaces clearButton)
    const newButton = document.getElementById('newButton');
    newButton?.addEventListener('click', () => {
      this.clearCurrentNote();
    });

    // Tab switching for polished notes (replaces polishButton)
    const polishedTab = document.querySelector('[data-tab="note"]') as HTMLButtonElement;
    polishedTab?.addEventListener('click', () => {
      // Switch to polished tab and trigger polishing if needed
      this.switchToPolishedTab();
    });

    // Export button
    this.elements.exportButton?.addEventListener('click', () => {
      this.exportNotes();
    });

    // Performance toggle button
    const performanceToggleButton = document.getElementById('performanceToggleButton');
    performanceToggleButton?.addEventListener('click', () => {
      this.togglePerformanceIndicator();
    });

    // Theme toggle button
    const themeToggleButton = document.getElementById('themeToggleButton');
    themeToggleButton?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // New "Generate Smart Charts" button
    const generateContextualChartsButton = document.getElementById('generateContextualChartsButton');
    generateContextualChartsButton?.addEventListener('click', () => {
      this.generateContextualCharts();
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    window.addEventListener('resize', () => {
      this.chartManager.resizeAllCharts();
    });
  }

  private async initializeAPIKey(): Promise<void> {
    try {
      // Load API key from localStorage
      const savedApiKey = localStorage.getItem('geminiApiKey');
      if (savedApiKey) {
        console.log('🔑 Loading saved API key from localStorage');
        this.apiService.setApiKey(savedApiKey);
        
        // Update the API key input field if it exists
        if (this.elements.apiKeyInput) {
          this.elements.apiKeyInput.value = savedApiKey;
        }
        
        // Also update the "remember key" checkbox
        const rememberKeyCheckbox = document.getElementById('rememberApiKey') as HTMLInputElement;
        if (rememberKeyCheckbox) {
          rememberKeyCheckbox.checked = true;
        }
      } else {
        console.log('⚠️ No API key found in localStorage - user will need to configure one');
      }
    } catch (error) {
      ErrorHandler.logError('Failed to initialize API key', error);
    }
  }

  private setupAudioRecorder(): void {
    this.audioRecorder.onTranscriptAvailable((transcript) => {
      this.transcriptBuffer += transcript + ' ';
      this.updateTranscriptionArea();
    });

    this.audioRecorder.onRecordingStateChange((recordingState) => {
      this.updateRecordingUI(recordingState);
    });
  }

  private async toggleRecording(): Promise<void> {
    try {
      if (!this.audioRecorder.isSupported()) {
        this.showToast({
          type: 'error',
          title: 'Not Supported',
          message: 'Audio recording is not supported in this browser.',
        });
        return;
      }

      if (this.state.isRecording) {
        this.audioRecorder.stopRecording();
        this.currentTranscript = this.transcriptBuffer.trim();
        this.state.isRecording = false;
        
        if (this.currentTranscript) {
          this.showToast({
            type: 'success',
            title: 'Recording Complete',
            message: 'Transcription ready for polishing.',
          });
        }
      } else {
        const success = await this.audioRecorder.startRecording();
        if (success) {
          this.state.isRecording = true;
          this.transcriptBuffer = '';
          this.showToast({
            type: 'info',
            title: 'Recording Started',
            message: 'Speak now...',
          });
        } else {
          this.showToast({
            type: 'error',
            title: 'Recording Failed',
            message: 'Could not start recording. Please check microphone permissions.',
          });
        }
      }

      this.updateUI();
    } catch (error) {
      ErrorHandler.logError('Failed to toggle recording', error);
      this.showToast({
        type: 'error',
        title: 'Recording Error',
        message: 'An error occurred while toggling recording.',
      });
    }
  }

  private async polishCurrentTranscription(): Promise<void> {
    try {
      if (!this.currentTranscript) {
        this.showToast({
          type: 'warning',
          title: 'No Transcription',
          message: 'Please record something first.',
        });
        return;
      }

      if (!this.apiService.hasValidApiKey() || this.apiService.initializationError) {
        this.showToast({
          type: 'warning',
          title: 'API Key Issue',
          message: `Please configure a valid API key in Settings. ${this.apiService.initializationError || ''}`,
        });
        return;
      }

      this.state.isProcessing = true;
      this.updateUI();

      const result = await this.performanceMonitor.measureOperation(
        () => this.apiService.polishTranscription(this.currentTranscript),
        'apiResponseTime',
        'PolishTranscription'
      );

      if (result.success && result.data) {
        this.state.currentNote = {
          id: Date.now().toString(),
          rawTranscription: this.currentTranscript,
          polishedNote: result.data,
          timestamp: Date.now(),
        };

        this.updatePolishedNoteArea();
        this.showToast({
          type: 'success',
          title: 'Polishing Complete',
          message: 'Your transcription has been improved.',
        });
      } else {
        this.showToast({
          type: 'error',
          title: 'Polishing Failed',
          message: result.error || 'Unknown error occurred.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to polish transcription', error);
      this.showToast({
        type: 'error',
        title: 'Processing Error',
        message: 'An error occurred while polishing the transcription.',
      });
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  private async generateContextualCharts(): Promise<void> {
    if (!this.currentTranscript) {
      this.showToast({
        type: 'warning',
        title: 'No Transcription',
        message: 'No transcription available to generate charts.',
      });
      return;
    }

    if (!this.apiService.hasValidApiKey() || this.apiService.initializationError) {
      this.showToast({
        type: 'warning',
        title: 'API Key Issue',
        message: `API Key issue: ${this.apiService.initializationError || 'Please configure a valid API key in Settings.'}`,
      });
      return;
    }

    this.state.isProcessing = true;
    this.updateUI();
    this.showToast({
      type: 'info',
      title: 'Generating Smart Charts',
      message: 'Asking AI for relevant chart ideas...',
    });

    const suggestionsResponse = await this.apiService.getRelevantChartSuggestions(this.currentTranscript);

    if (!suggestionsResponse.success || !suggestionsResponse.data || suggestionsResponse.data.length === 0) {
      this.showToast({
        type: 'warning',
        title: 'No Chart Suggestions',
        message: suggestionsResponse.error || 'AI could not suggest relevant charts for this text.',
      });
      this.state.isProcessing = false;
      this.updateUI();
      return;
    }

    const chartArea = document.getElementById('aiChartDisplayArea');
    if (!chartArea) {
      ErrorHandler.logError('Chart display area (aiChartDisplayArea) not found in DOM.', new Error('MissingDOMElement'));
      this.showToast({ type: 'error', title: 'UI Error', message: 'Chart display area not found.' });
      this.state.isProcessing = false;
      this.updateUI();
      return;
    }

    this.chartManager.destroyAllCharts(); // Clear existing charts from manager
    chartArea.innerHTML = ''; // Clear the HTML content of the area

    this.showToast({
      type: 'info',
      title: 'Generating Charts',
      message: `Received ${suggestionsResponse.data.length} suggestions. Now fetching chart data...`,
    });

    let chartsGeneratedSuccessfully = 0;
    for (const suggestion of suggestionsResponse.data) {
      const { chartType, chartTitle, reason } = suggestion;
      // Ensure unique canvasId for each chart
      const canvasId = `chart-${chartType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Create container and get canvas element using ChartManager
      const canvasElement = this.chartManager.createChartContainer(chartArea, canvasId, chartTitle, reason);

      if (!canvasElement) {
        ErrorHandler.logError(`Failed to create chart container for ${chartTitle}`, new Error('ContainerCreationError'));
        this.showToast({ type: 'error', title: 'UI Error', message: `Could not create container for chart: '${chartTitle}'.` });
        continue; // Skip to next suggestion
      }

      const chartDataResponse = await this.apiService.generateChartData(this.currentTranscript, chartType);

      if (chartDataResponse.success && chartDataResponse.data) {
        try {
          let chartCreated = false;
          switch (chartType) {
            case 'topics':
              chartCreated = !!this.chartManager.createTopicChart(canvasElement, chartDataResponse.data, chartTitle);
              break;
            case 'sentiment':
              chartCreated = !!this.chartManager.createSentimentChart(canvasElement, chartDataResponse.data, chartTitle);
              break;
            case 'wordFrequency':
              chartCreated = !!this.chartManager.createWordFrequencyChart(canvasElement, chartDataResponse.data, chartTitle);
              break;
            case 'line':
              chartCreated = !!this.chartManager.createLineChart(canvasElement, chartDataResponse.data, chartTitle);
              break;
            default:
              ErrorHandler.logError(`Unknown chart type suggested: ${chartType}`, new Error('UnknownChartType'));
              this.showToast({ type: 'warning', title: 'Unknown Chart', message: `Cannot render unknown chart type: '${chartType}'.` });
              canvasElement.parentElement?.remove(); // Clean up container for unknown type
              continue; // Skip to next suggestion
          }

          if (chartCreated) {
            this.showToast({ type: 'success', title: 'Chart Ready', message: `'${chartTitle}' has been generated.` });
            chartsGeneratedSuccessfully++;
          } else {
            // This case handles if create<Type>Chart returns null (e.g. context error)
            throw new Error('ChartManager returned null for chart creation.');
          }
        } catch (renderError: any) {
            ErrorHandler.logError(`Failed to render chart '${chartTitle}' with type ${chartType}`, renderError);
            this.showToast({ type: 'error', title: 'Chart Render Error', message: `Could not render chart '${chartTitle}': ${renderError.message}`});
            canvasElement.parentElement?.remove(); // Clean up container for render error
        }
      } else {
        this.showToast({
          type: 'error',
          title: 'Chart Data Error',
          message: `Could not fetch data for '${chartTitle}': ${chartDataResponse.error || 'Unknown error'}`,
        });
        canvasElement.parentElement?.remove(); // Clean up container if data fetching failed
      }
    }

    this.state.isProcessing = false;
    this.updateUI();

    if (chartsGeneratedSuccessfully === suggestionsResponse.data.length && chartsGeneratedSuccessfully > 0) {
        this.showToast({ type: 'success', title: 'Smart Charts Complete', message: 'All suggested charts generated successfully.' });
    } else if (chartsGeneratedSuccessfully > 0) {
        this.showToast({ type: 'warning', title: 'Smart Charts Partially Complete', message: `Generated ${chartsGeneratedSuccessfully} out of ${suggestionsResponse.data.length} suggested charts.` });
    } else if (suggestionsResponse.data.length > 0) { // Attempted but none succeeded
        this.showToast({ type: 'error', title: 'Smart Charts Failed', message: 'Could not generate any of the suggested charts.' });
    }
    // If suggestionsResponse.data.length was 0, initial warning already shown.
  }
  
  private saveCurrentNote(): void {
    try {
      if (!this.state.currentNote) {
        this.showToast({
          type: 'warning',
          title: 'No Note',
          message: 'There is no note to save.',
        });
        return;
      }

      DataProcessor.saveNote(this.state.currentNote);
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();

      this.showToast({
        type: 'success',
        title: 'Note Saved',
        message: 'Your note has been saved successfully.',
      });
    } catch (error) {
      ErrorHandler.logError('Failed to save note', error);
      this.showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save the note.',
      });
    }
  }

  private clearCurrentNote(): void {
    this.currentTranscript = '';
    this.transcriptBuffer = '';
    this.state.currentNote = null;
    this.chartManager.destroyAllCharts();
    this.updateUI();

    this.showToast({
      type: 'info',
      title: 'Cleared',
      message: 'Current note and charts have been cleared.',
    });
  }

  private exportNotes(): void {
    try {
      const format = 'markdown'; // Could be made configurable
      const includeRaw = true;
      const exportData = DataProcessor.exportNotes(format, includeRaw);

      if (exportData) {
        const blob = new Blob([exportData], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-notes-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast({
          type: 'success',
          title: 'Export Complete',
          message: 'Notes have been exported successfully.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to export notes', error);
      this.showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export notes.',
      });
    }
  }

  private async testAPIConnection(): Promise<void> {
    try {
      const result = await this.apiService.testConnection();
      
      if (result.success) {
        this.showToast({
          type: 'success',
          title: 'API Connected',
          message: 'Gemini API connection successful.',
          duration: 3000,
        });
      } else {
        let toastMessage = result.error || 'Unknown API connection error.';
        let toastTitle = 'API Connection Failed';

        if (this.apiService.initializationError) {
          // Prioritize initializationError message if available
          toastMessage = `Error: ${this.apiService.initializationError}. Please check your API key in Settings.`;
          toastTitle = 'API Initialization Error';
        } else if (result.error) {
          // Use specific error messages for common issues
          if (result.error.includes(ERROR_MESSAGES.API.API_KEY_MISSING)) {
            toastMessage = 'API Key is missing. Please configure it in Settings.';
            toastTitle = 'API Key Missing';
          } else if (result.error.toLowerCase().includes('invalid api key')) {
            toastMessage = 'The provided API Key is invalid. Please check it in Settings.';
            toastTitle = 'Invalid API Key';
          }
        }
        
        // Avoid showing redundant "API Key must be set" if a more specific error from initializationError is shown
        // Only show toast if it's not the initial "API Key must be set" during load and no other error is present
        const isInitialMissingKeyMessage = result.error === ERROR_MESSAGES.API.API_KEY_MISSING && !localStorage.getItem('geminiApiKey');

        if (!isInitialMissingKeyMessage || this.apiService.initializationError) {
             this.showToast({
                type: 'error',
                title: toastTitle,
                message: toastMessage,
                duration: 7000,
             });
        } else if (!this.apiService.initializationError) {
            // This case handles when API key is not set yet, but it's not an "error" state yet for a new user.
            console.log('ℹ️ API key not yet configured. User can set it in settings.');
        }
      }
    } catch (error) {
      ErrorHandler.logError('API connection test failed', error);
    }
  }

  private loadExistingNotes(): void {
    this.state.notes = DataProcessor.getAllNotes();
    this.updateNotesDisplay();
  }

  private updateTranscriptionArea(): void {
    if (this.elements.transcriptionArea) {
      this.elements.transcriptionArea.textContent = this.transcriptBuffer;
    }
  }

  private updatePolishedNoteArea(): void {
    if (this.elements.polishedNoteArea && this.state.currentNote) {
      this.elements.polishedNoteArea.textContent = this.state.currentNote.polishedNote;
    }
  }

  private updateRecordingUI(recordingState: RecordingState): void {
    if (this.elements.recordButton) {
      if (recordingState.isRecording) {
        this.elements.recordButton.textContent = recordingState.isPaused ? 'Resume' : 'Stop Recording';
        this.elements.recordButton.className = 'button-stop';
      } else {
        this.elements.recordButton.textContent = 'Start Recording';
        this.elements.recordButton.className = 'button-record';
      }
    }

    if (this.elements.statusDisplay) {
      if (recordingState.isRecording) {
        const duration = this.audioRecorder.formatDuration(recordingState.duration);
        const status = recordingState.isPaused ? 'Paused' : 'Recording';
        this.elements.statusDisplay.textContent = `${status} - ${duration}`;
      } else {
        this.elements.statusDisplay.textContent = 'Ready';
      }
    }
  }

  private updateNotesDisplay(): void {
    if (!this.elements.notesContainer) return;

    this.elements.notesContainer.innerHTML = '';
    
    this.state.notes.forEach(note => {
      const noteElement = this.createNoteElement(note);
      this.elements.notesContainer!.appendChild(noteElement);
    });
  }

  private createNoteElement(note: any): HTMLElement {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.innerHTML = `
      <div class="note-header">
        <h3>${note.title}</h3>
        <span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span>
      </div>
      <div class="note-content">${note.polishedNote.substring(0, 200)}...</div>
      <div class="note-actions">
        <button onclick="app.loadNote('${note.id}')">Load</button>
        <button onclick="app.deleteNote('${note.id}')">Delete</button>
      </div>
    `;
    return noteDiv;
  }

  private updateUI(): void {
    // Update button states
    if (this.elements.recordButton) {
      this.elements.recordButton.disabled = this.state.isProcessing;
    }

    // Update processing indicators
    const processingElements = document.querySelectorAll('.processing-indicator');
    processingElements.forEach(el => {
      el.style.display = this.state.isProcessing ? 'block' : 'none';
    });
  }

  private showToast(options: ToastOptions): void {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type}`;
    toast.innerHTML = `
      <div class="toast-title">${options.title}</div>
      <div class="toast-message">${options.message}</div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, options.duration || 5000);
  }

  private cleanup(): void {
    console.log('🧹 Starting application cleanup...');
    
    // Clear auto-save and UI update intervals
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    if (this.uiUpdateInterval) {
      clearInterval(this.uiUpdateInterval);
      this.uiUpdateInterval = null;
    }
    
    // Cleanup performance services
    this.performanceMonitor.cleanup();
    this.intervalManager.cleanup();
    this.bundleOptimizer.cleanup();
    
    // Cleanup existing services
    this.audioRecorder.cleanup();
    this.chartManager.destroyAllCharts();
    
    // Cleanup utilities
    MemoryManager.cleanup();
    
    console.log('✅ Application cleanup completed');
  }

  private registerLazyModules(): void {
    // Register modules for lazy loading
    this.bundleOptimizer.registerLazyModule('charting', async () => {
      const { Chart } = await import('chart.js');
      return { Chart };
    });

    this.bundleOptimizer.registerLazyModule('fileProcessing', async () => {
      const [mammoth, tesseract, pdfjsLib] = await Promise.all([
        import('mammoth'),
        import('tesseract.js'),
        import('pdfjs-dist')
      ]);
      return { mammoth, tesseract, pdfjsLib };
    });

    this.bundleOptimizer.registerLazyModule('advancedFeatures', async () => {
      // Load advanced features when needed
      return {};
    });
  }

  private setupAutoSave(): void {
    // Auto-save every 30 seconds if there are changes
    this.autoSaveInterval = this.intervalManager.createRecurringTask(
      'AutoSave',
      30000, // 30 seconds
      () => {
        if (this.state.currentNote && !this.state.isProcessing) {
          this.performanceMonitor.measureOperation(
            () => {
              DataProcessor.saveNote(this.state.currentNote!);
            },
            'renderTime',
            'AutoSave'
          );
        }
      },
      {
        onError: (error) => {
          console.warn('Auto-save failed:', error);
        }
      }
    );
  }

  private setupPeriodicUpdates(): void {
    // Update UI performance metrics every 10 seconds
    this.uiUpdateInterval = this.intervalManager.createRecurringTask(
      'UIUpdate',
      10000, // 10 seconds
      () => {
        this.updatePerformanceUI();
      }
    );
  }

  private updatePerformanceUI(): void {
    const performanceIndicator = document.getElementById('performanceIndicator');
    if (!performanceIndicator || performanceIndicator.style.display === 'none') {
      return;
    }

    // Update performance indicators in the UI
    const metrics = this.performanceMonitor.getLatestMetrics();
    const alerts = this.performanceMonitor.getAlerts();
    
    if (metrics) {
      // Update memory usage indicator
      const memoryElement = document.getElementById('memoryUsage');
      if (memoryElement) {
        const memoryMB = (metrics.memoryUsage / 1024 / 1024).toFixed(2);
        memoryElement.textContent = `${memoryMB}MB`;
      }

      // Update CPU usage indicator (using operation durations as proxy)
      const cpuElement = document.getElementById('cpuUsage');
      if (cpuElement) {
        const recentOperations = this.performanceMonitor.getRecentOperations();
        const avgDuration = recentOperations.length > 0 
          ? recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length
          : 0;
        const cpuLoad = Math.min(100, Math.round(avgDuration / 10)); // Rough approximation
        cpuElement.textContent = `${cpuLoad}%`;
      }

      // Update frame rate indicator
      const frameRateElement = document.getElementById('frameRate');
      if (frameRateElement) {
        frameRateElement.textContent = `${Math.round(metrics.frameRate)}`;
      }

      // Update performance alerts
      const performanceAlert = document.getElementById('performanceAlert');
      const performanceAlertText = document.getElementById('performanceAlertText');
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
      
      if (criticalAlerts.length > 0 && performanceAlert && performanceAlertText) {
        const latestAlert = criticalAlerts[criticalAlerts.length - 1];
        performanceAlertText.textContent = latestAlert.message;
        performanceAlert.style.display = 'flex';
      } else if (performanceAlert) {
        performanceAlert.style.display = 'none';
      }
    }
  }

  private togglePerformanceIndicator(): void {
    const performanceIndicator = document.getElementById('performanceIndicator');
    const performanceToggleButton = document.getElementById('performanceToggleButton');
    
    if (performanceIndicator) {
      const isVisible = performanceIndicator.style.display !== 'none';
      
      if (isVisible) {
        performanceIndicator.style.display = 'none';
        performanceToggleButton?.classList.remove('active');
      } else {
        performanceIndicator.style.display = 'block';
        performanceToggleButton?.classList.add('active');
        // Immediately update the UI when shown
        this.updatePerformanceUI();
      }
    }
  }

  // Public methods for external access
  public loadNote(noteId: string): void {
    const note = this.state.notes.find(n => n.id === noteId);
    if (note) {
      this.state.currentNote = note;
      this.currentTranscript = note.rawTranscription;
      this.updateTranscriptionArea();
      this.updatePolishedNoteArea();
    }
  }

  public deleteNote(noteId: string): void {
    if (DataProcessor.deleteNote(noteId)) {
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();
      this.showToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'The note has been deleted.',
      });
    }
  }

  private async performInitialHealthCheck(): Promise<void> {
    try {
      console.log('🏥 Performing initial health check...');
      const healthStatus = await this.healthCheckService.getHealthStatus();
      
      if (healthStatus.status === 'unhealthy') {
        console.warn('⚠️ Health check detected issues:', healthStatus);
        this.showToast({
          type: 'warning',
          title: 'System Health Warning',
          message: 'Some system checks failed. The app may not function optimally.',
        });
      } else if (healthStatus.status === 'warning') {
        console.warn('⚠️ Health check warnings:', healthStatus);
      } else {
        console.log('✅ Health check passed - all systems operational');
      }

      // Log health status in production
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('health_check', {
          status: healthStatus.status,
          checks: Object.keys(healthStatus.checks).length,
          failedChecks: Object.values(healthStatus.checks)
            .filter(check => check.status === 'fail').length
        });
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.showToast({
        type: 'error',
        title: 'Health Check Failed',
        message: 'Unable to verify system health. Some features may be unavailable.',
      });
    }
  }

  public async getHealthStatus() {
    return await this.healthCheckService.getHealthStatus();
  }

  /**
   * Switch to the polished tab view
   */
  private switchToPolishedTab(): void {
    try {
      const tabNav = document.querySelector('.tab-navigation');
      if (!tabNav) {
        console.error('Tab navigation not found');
        return;
      }

      // Find the polished tab button
      const polishedTabButton = tabNav.querySelector('.tab-button[data-tab="note"]') as HTMLButtonElement;
      const rawTabButton = tabNav.querySelector('.tab-button[data-tab="raw"]') as HTMLButtonElement;

      if (!polishedTabButton) {
        console.error('Polished tab button not found');
        return;
      }

      // Update tab button states
      polishedTabButton.classList.add('active');
      if (rawTabButton) {
        rawTabButton.classList.remove('active');
      }

      // Show polished note content
      const polishedNote = document.getElementById('polishedNote');
      const rawTranscription = document.getElementById('rawTranscription');

      if (polishedNote) {
        polishedNote.classList.add('active');
        polishedNote.style.display = 'block';
      }

      if (rawTranscription) {
        rawTranscription.classList.remove('active');
        rawTranscription.style.display = 'none';
      }

      // Update the active tab indicator position
      const activeTabIndicator = tabNav.querySelector('.active-tab-indicator') as HTMLElement;
      if (activeTabIndicator && polishedTabButton) {
        const buttonRect = polishedTabButton.getBoundingClientRect();
        const navRect = tabNav.getBoundingClientRect();
        const relativeLeft = buttonRect.left - navRect.left;
        
        activeTabIndicator.style.left = `${relativeLeft}px`;
        activeTabIndicator.style.width = `${buttonRect.width}px`;
      }

      console.log('Switched to polished tab successfully');

      // Track tab switch
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('tab_switched', {
          tab: 'polished',
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Error switching to polished tab:', error);
      this.showToast({
        type: 'error',
        title: 'Tab Switch Failed',
        message: 'Unable to switch to polished tab.',
      });

      if (this.productionMonitor) {
        this.productionMonitor.trackError('tab_switch_failed', error);
      }
    }
  }

  // Theme system methods
  private initTheme(): void {
    console.log('Initializing theme system...');
    
    try {
      // Check saved theme preference
      const savedTheme = localStorage.getItem('voice-notes-theme') || 'dark';
      
      // Apply the saved theme
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
      
      // Update theme toggle icon
      const themeToggleButton = document.getElementById('themeToggleButton');
      if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i');
        if (icon) {
          icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
      }
      
      console.log(`Theme initialized: ${savedTheme}`);
      
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // Fallback to dark theme
      document.body.className = '';
      this.showToast({
        type: 'error',
        title: 'Theme Error',
        message: 'Failed to initialize theme system',
      });
    }
  }

  private toggleTheme(): void {
    console.log('Toggling theme...');
    
    try {
      const isLightMode = document.body.classList.contains('light-mode');
      const newTheme = isLightMode ? 'dark' : 'light';
      
      // Toggle the theme
      if (isLightMode) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
      
      // Save theme preference
      localStorage.setItem('voice-notes-theme', newTheme);
      
      // Update theme toggle icon
      const themeToggleButton = document.getElementById('themeToggleButton');
      if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i');
        if (icon) {
          icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
      }
      
      this.showToast({
        type: 'success',
        title: 'Theme Changed',
        message: `Switched to ${newTheme} mode`,
      });
      
      console.log(`Theme toggled to: ${newTheme}`);
      
      // Track theme toggle
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('theme_toggled', {
          theme: newTheme,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Failed to toggle theme:', error);
      this.showToast({
        type: 'error',
        title: 'Theme Error',
        message: 'Failed to change theme',
      });
    }
  }

  // Helper methods for chart creation (now removed and moved to ChartManager)
}
