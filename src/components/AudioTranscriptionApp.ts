/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, AppState, ErrorContext, AllAIChartData, AIChartDataPayload, TopicDataInput, SentimentDataInput, WordFrequencyInput } from '../types/index.js'; // Added more types
import { APIService } from '../services/APIService.js';
import { ChartManager } from '../services/ChartManager.js';
import { TabNavigator } from './UIComponents/TabNavigator.js'; // Import TabNavigator
import { DataProcessor } from '../services/DataProcessor.js';
import { AudioRecorder, RecordingState } from '../services/AudioRecorder.js';
import { PerformanceMonitor } from '../services/PerformanceMonitor.js';
import { IntervalManager } from '../services/IntervalManager.js';
import { BundleOptimizer } from '../services/BundleOptimizer.js';
import { ProductionMonitor } from '../services/ProductionMonitor.js';
import { HealthCheckService } from '../services/HealthCheckService.js';
import { ErrorHandler, MemoryManager, showToast as utilShowToast } from '../utils.js'; // Added showToast as utilShowToast
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
  private tabNavigator!: TabNavigator; // Added TabNavigator instance
  private state: AppState;
  private currentTranscript: string = '';
  private transcriptBuffer: string = '';
  private isSampleData: boolean = false; // Added declaration
  private fullTranscription: string = ''; // Added declaration

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
      this.setupEventListeners(); // Call before setupTabNavigator if it relies on DOM elements selected here
      this.setupTabNavigator(); // Setup TabNavigator
      
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
      
      console.log('🎙️ Audio Transcription App initialized successfully');
    } catch (error) {
      ErrorHandler.logError('Failed to initialize app', error);
      utilShowToast({ // Replaced this.showToast
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

    // Test Chart button (replaces generateChartsButton)
    const testChartButton = document.getElementById('testChartButton');
    testChartButton?.addEventListener('click', () => {
      this.generateCharts();
    });

    // Sample Charts button (additional chart generation)
    const sampleChartsButton = document.getElementById('sampleChartsButton');
    sampleChartsButton?.addEventListener('click', () => {
      this.generateSampleCharts();
    });

    // New/Clear button (replaces clearButton)
    const newButton = document.getElementById('newButton');
    newButton?.addEventListener('click', () => {
      this.clearCurrentNote();
    });

    // Tab switching event listeners are now handled by TabNavigator

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

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    window.addEventListener('resize', this.handleResize);
  }

  // Bound method for resize event listener
  private handleResize = () => {
    this.chartManager.resizeAllCharts();
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
        utilShowToast({ // Replaced this.showToast
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
          utilShowToast({ // Replaced this.showToast
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
          utilShowToast({ // Replaced this.showToast
            type: 'info',
            title: 'Recording Started',
            message: 'Speak now...',
          });
        } else {
          utilShowToast({ // Replaced this.showToast
            type: 'error',
            title: 'Recording Failed',
            message: 'Could not start recording. Please check microphone permissions.',
          });
        }
      }

      this.updateUI();
    } catch (error) {
      ErrorHandler.logError('Failed to toggle recording', error);
      utilShowToast({ // Replaced this.showToast
        type: 'error',
        title: 'Recording Error',
        message: 'An error occurred while toggling recording.',
      });
    }
  }

  private async polishCurrentTranscription(): Promise<void> {
    try {
      if (!this.currentTranscript) {
        utilShowToast({ // Replaced this.showToast
          type: 'warning',
          title: 'No Transcription',
          message: 'Please record something first.',
        });
        return;
      }

      if (!this.apiService.hasValidApiKey()) {
        utilShowToast({ // Replaced this.showToast
          type: 'warning',
          title: 'API Key Required',
          message: 'Please enter your Gemini API key.',
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
        utilShowToast({ // Replaced this.showToast
          type: 'success',
          title: 'Polishing Complete',
          message: 'Your transcription has been improved.',
        });
      } else {
        utilShowToast({ // Replaced this.showToast
          type: 'error',
          title: 'Polishing Failed',
          message: result.error || 'Unknown error occurred.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to polish transcription', error);
      utilShowToast({ // Replaced this.showToast
        type: 'error',
        title: 'Processing Error',
        message: 'An error occurred while polishing the transcription.',
      });
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  private async generateCharts(): Promise<void> {
    if (this.isSampleData) {
        console.log("generateCharts called while isSampleData is true; AI chart generation skipped.");
        this.isSampleData = false; // Reset flag after skipping
        return;
    }
    console.log('Generating charts from AI...');
    // this.showLoading('Generating charts from AI...'); // showLoading is not defined
    this.state.isProcessing = true;
    this.updateUI();

    try {
      const textToAnalyze = this.fullTranscription || this.currentTranscript;
      if (!textToAnalyze) {
          ErrorHandler.logWarning('No transcription data available to generate AI charts.', 'generateCharts');
          utilShowToast({
            type: 'warning',
            title: 'Missing Data',
            message: 'No transcription data available for AI chart generation.',
          });
          this.state.isProcessing = false;
          this.updateUI();
          return;
      }

      const chartDataResponse = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateChartData(textToAnalyze, 'all'),
        'apiResponseTime',
        'generateChartData_AI'
      );

      if (chartDataResponse.success && chartDataResponse.data) {
        // Data from API is AllAIChartData | AIChartDataPayload. _renderCharts expects AllAIChartData.
        // If 'all' was requested, it should be AllAIChartData.
        if (chartDataResponse.data && typeof chartDataResponse.data === 'object' && ('topics' in chartDataResponse.data || 'sentiment' in chartDataResponse.data || 'wordFrequency' in chartDataResponse.data)) {
            this._renderCharts(chartDataResponse.data as AllAIChartData, 'ai');
        } else {
            // Handle cases where a single chart type might have been returned if API supports it
            // This part may need adjustment based on actual API behavior for non-'all' types
            ErrorHandler.logWarning('Received single chart data from AI when expecting AllAIChartData.', 'generateCharts');
            // Example: wrap it if it's a known single type
            // if (chartDataResponse.data && chartDataResponse.data.labels) { // simplistic check
            //   this._renderCharts({ [SOME_TYPE_DETERMINED_ELSEWHERE]: chartDataResponse.data as AIChartDataPayload }, 'ai');
            // }
             utilShowToast({ type: 'error', title: 'AI Chart Data Error', message: 'Unexpected chart data format from AI.'});
        }
      } else {
        ErrorHandler.logError('Failed to fetch chart data from AI', chartDataResponse.error || 'Unknown error from API');
        utilShowToast({
          type: 'error',
          title: 'AI Chart Data Error',
          message: chartDataResponse.error || 'Could not retrieve chart data from AI.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Error in generateCharts (AI)', error); // Keep this specific
      utilShowToast({
        type: 'error',
        title: 'Chart Generation Failed',
        message: 'An unexpected error occurred while generating AI charts.',
      });
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  private saveCurrentNote(): void {
    try {
      if (!this.state.currentNote) {
        utilShowToast({ // Replaced this.showToast
          type: 'warning',
          title: 'No Note',
          message: 'There is no note to save.',
        });
        return;
      }

      DataProcessor.saveNote(this.state.currentNote);
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();

      utilShowToast({ // Replaced this.showToast
        type: 'success',
        title: 'Note Saved',
        message: 'Your note has been saved successfully.',
      });
    } catch (error) {
      ErrorHandler.logError('Failed to save note', error);
      utilShowToast({ // Replaced this.showToast
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

    utilShowToast({ // Replaced this.showToast
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

        utilShowToast({ // Replaced this.showToast
          type: 'success',
          title: 'Export Complete',
          message: 'Notes have been exported successfully.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to export notes', error);
      utilShowToast({ // Replaced this.showToast
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
        utilShowToast({ // Replaced this.showToast
          type: 'success',
          title: 'API Connected',
          message: 'Gemini API connection successful.',
          duration: 3000,
        });
      } else {
        // Check if it's specifically an API key issue
        if (result.error?.includes('API Key must be set')) {
          console.log('ℹ️ No API key configured - user can set one in settings');
          // Don't show error toast on initial load if no API key is set
        } else {
          utilShowToast({ // Replaced this.showToast
            type: 'error',
            title: 'API Connection Failed',
            message: result.error || 'Unknown error',
          });
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

    // Remove global event listeners
    window.removeEventListener('resize', this.handleResize);
    
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
      utilShowToast({ // Replaced this.showToast
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
        utilShowToast({ // Replaced this.showToast
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
      utilShowToast({ // Replaced this.showToast
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
   * Generate sample charts for demonstration purposes
   */
  private async generateSampleCharts(): Promise<void> {
    this.isSampleData = true; // Sets flag that generateCharts might check
    // this.showLoading('Generating sample charts...'); // showLoading is not defined
    console.log('Generating sample charts...');
    this.state.isProcessing = true;
    this.updateUI();

    try {
      const chartDataResponse = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateSampleChartData(),
        'apiResponseTime',
        'generateSampleChartData'
      );

      if (chartDataResponse.success && chartDataResponse.data) {
        this._renderCharts(chartDataResponse.data, 'sample'); // generateSampleChartData returns AllAIChartData
        console.log('Sample charts generated and rendered successfully.');
      } else {
        ErrorHandler.logError('Failed to fetch sample chart data', chartDataResponse.error || 'Unknown error from API');
        utilShowToast({
          type: 'error',
          title: 'Sample Chart Data Error',
          message: chartDataResponse.error || 'Could not retrieve sample chart data.',
        });
      }
    } catch (error) {
      ErrorHandler.logError('Error in generateSampleCharts', error); // Keep this specific
      utilShowToast({
        type: 'error',
        title: 'Chart Generation Failed',
        message: 'Failed to generate sample charts. Please try again.',
      });

      if (this.productionMonitor) {
        this.productionMonitor.trackError('sample_charts_generation_failed', error);
      }
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  // switchToPolishedTab method is removed, its logic is now in handleTabSwitch

  private setupTabNavigator(): void {
    const tabOptions = {
      tabNavigationContainerSelector: '.tab-navigation', // Ensure this matches your HTML
      tabButtonSelector: '.tab-button',
      activeTabIndicatorSelector: '.active-tab-indicator',
      initialTabId: 'rawTranscription' // Default to raw tab's ID
    };

    this.tabNavigator = new TabNavigator(
      tabOptions,
      (tabId: string) => this.handleTabSwitch(tabId),
      this.productionMonitor // Optional: pass the production monitor instance
    );
    // Ensure the initial tab content is displayed correctly by calling handleTabSwitch
    // if TabNavigator's constructor doesn't call the onTabSwitch callback for the initial tab.
    // Based on current TabNavigator, activateTab(..., true) does not call the main callback.
    // So, we call it manually here for the initial setup.
    if (tabOptions.initialTabId) {
        this.handleTabSwitch(tabOptions.initialTabId, true);
    } else {
        // Fallback if no initialTabId, e.g., activate first tab's content
        const firstButton = document.querySelector(tabOptions.tabButtonSelector) as HTMLButtonElement;
        if (firstButton && firstButton.dataset.tab) {
            this.handleTabSwitch(firstButton.dataset.tab, true);
        }
    }
  }

  private handleTabSwitch(tabId: string, isInitialSetup: boolean = false): void {
    const polishedNotePane = document.getElementById('polishedNote');
    const rawTranscriptionPane = document.getElementById('rawTranscription');

    if (tabId === 'note' || tabId === 'polishedNote') { // data-tab="note" for button, id="polishedNote" for pane
      polishedNotePane?.classList.add('active');
      polishedNotePane?.style.setProperty('display', 'block');
      rawTranscriptionPane?.classList.remove('active');
      rawTranscriptionPane?.style.setProperty('display', 'none');
    } else if (tabId === 'raw' || tabId === 'rawTranscription') { // data-tab="raw" for button, id="rawTranscription" for pane
      rawTranscriptionPane?.classList.add('active');
      rawTranscriptionPane?.style.setProperty('display', 'block');
      polishedNotePane?.classList.remove('active');
      polishedNotePane?.style.setProperty('display', 'none');
    } else {
      console.warn(`Unknown tabId: ${tabId}`);
      return;
    }

    if(!isInitialSetup) {
        // Production monitor tracking is now handled by TabNavigator itself if configured
        // Or keep it here if TabNavigator's tracking is removed/conditional
        console.log(`App handled switch to tab: ${tabId}`);
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
      utilShowToast({ // Replaced this.showToast
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
      
      utilShowToast({ // Replaced this.showToast
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
      utilShowToast({ // Replaced this.showToast
        type: 'error',
        title: 'Theme Error',
        message: 'Failed to change theme',
      });
    }
  }

  // Helper methods for chart creation

  private _renderCharts(chartData: AllAIChartData, context: string): void { // Typed chartData
    if (!chartData) {
      ErrorHandler.logWarning(`No chart data provided for context: ${context}`, '_renderCharts');
      return;
    }

    const chartDisplayArea = document.getElementById('aiChartDisplayArea');
    if (chartDisplayArea) {
        chartDisplayArea.innerHTML = ''; // Clear existing charts
    } else {
        ErrorHandler.logError("'aiChartDisplayArea' not found for rendering charts.", '_renderCharts');
        return;
    }

    // Iterate over known chart types in AllAIChartData
    if (chartData.topics) {
      const chartId = `topicsChart-${context}`;
      const title = this.getChartTitle('topics');
      this.createChartContainer(chartId, title, this.getChartDescription('topics'));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createTopicChart(chartId, chartData.topics as TopicDataInput, title),
        'chartRenderTime', `createChart_topics_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering topics chart for ${context}`, err));
    }

    if (chartData.sentiment) {
      const chartId = `sentimentChart-${context}`;
      const title = this.getChartTitle('sentiment');
      this.createChartContainer(chartId, title, this.getChartDescription('sentiment'));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createSentimentChart(chartId, chartData.sentiment as SentimentDataInput, title),
        'chartRenderTime', `createChart_sentiment_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering sentiment chart for ${context}`, err));
    }

    if (chartData.wordFrequency) {
      const chartId = `wordFrequencyChart-${context}`;
      const title = this.getChartTitle('wordFrequency');
      this.createChartContainer(chartId, title, this.getChartDescription('wordFrequency'));
      this.performanceMonitor.measureOperation(
        () => this.chartManager.createWordFrequencyChart(chartId, chartData.wordFrequency as WordFrequencyInput, title),
        'chartRenderTime', `createChart_wordFrequency_${context}`
      ).catch(err => ErrorHandler.logError(`Error rendering wordFrequency chart for ${context}`, err));
    }
    // Add other chart types here if AllAIChartData expands
  }

  private createChartContainer(canvasId: string, title: string, description: string): void {
    const chartDisplayArea = document.getElementById('aiChartDisplayArea');
    if (!chartDisplayArea) {
      console.error(`Chart display area 'aiChartDisplayArea' not found for canvasId: ${canvasId}`);
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
      case 'topics':
        return 'Topic Distribution';
      case 'sentiment':
        return 'Sentiment Analysis';
      case 'wordFrequency':
        return 'Word Frequency';
      default:
        return 'Chart';
    }
  }

  private getChartDescription(chartType: string): string {
    switch (chartType) {
      case 'topics':
        return 'Main topics identified in your transcription';
      case 'sentiment':
        return 'Emotional tone breakdown of your content';
      case 'wordFrequency':
        return 'Most frequently used words in your transcription';
      default:
        return 'Data visualization';
    }
  }
}
