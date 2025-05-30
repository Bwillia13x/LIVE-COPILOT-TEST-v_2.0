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

  // Performance tracking
  private autoSaveInterval: number | null = null;
  private uiUpdateInterval: number | null = null;

  // DOM element references
  private elements: {
    recordButton?: HTMLButtonElement;
    transcriptionArea?: HTMLTextAreaElement;
    polishedNoteArea?: HTMLTextAreaElement;
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
      this.setupAudioRecorder();
      this.loadExistingNotes();
      this.updateUI();
      
      // Set up auto-save functionality
      this.setupAutoSave();
      
      // Set up periodic UI updates
      this.setupPeriodicUpdates();
      
      // Test API connection
      await this.testAPIConnection();
      
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
      transcriptionArea: document.getElementById('transcriptionArea') as HTMLTextAreaElement,
      polishedNoteArea: document.getElementById('polishedNoteArea') as HTMLTextAreaElement,
      statusDisplay: document.getElementById('statusDisplay') as HTMLElement,
      chartContainer: document.getElementById('chartContainer') as HTMLElement,
      apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement,
      notesContainer: document.getElementById('notesContainer') as HTMLElement,
      exportButton: document.getElementById('exportButton') as HTMLButtonElement,
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

    // Polish button
    const polishButton = document.getElementById('polishButton');
    polishButton?.addEventListener('click', () => {
      this.polishCurrentTranscription();
    });

    // Generate charts button
    const generateChartsButton = document.getElementById('generateChartsButton');
    generateChartsButton?.addEventListener('click', () => {
      this.generateCharts();
    });

    // Save note button
    const saveButton = document.getElementById('saveButton');
    saveButton?.addEventListener('click', () => {
      this.saveCurrentNote();
    });

    // Clear button
    const clearButton = document.getElementById('clearButton');
    clearButton?.addEventListener('click', () => {
      this.clearCurrentNote();
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

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    window.addEventListener('resize', () => {
      this.chartManager.resizeAllCharts();
    });
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

      if (!this.apiService.hasValidApiKey()) {
        this.showToast({
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

  private async generateCharts(): Promise<void> {
    return await this.performanceMonitor.measureOperation('generateCharts', async () => {
      try {
        if (!this.state.currentNote?.polishedNote) {
          this.showToast({
            type: 'warning',
            title: 'No Content',
            message: 'Please polish a transcription first.',
          });
          return;
        }

        if (!this.apiService.hasValidApiKey()) {
          this.showToast({
            type: 'warning',
            title: 'API Key Required',
            message: 'Please enter your Gemini API key.',
          });
          return;
        }

        this.state.isProcessing = true;
        this.updateUI();

        const content = this.state.currentNote.polishedNote;

        // Load charting module lazily for optimal performance
        await this.bundleOptimizer.loadModule('charting');

        // Generate different types of charts with performance tracking
        const chartTypes = ['topics', 'sentiment', 'wordFrequency'];
        const chartPromises = chartTypes.map(type => 
          this.performanceMonitor.measureOperation(`generateChartData_${type}`, () =>
            this.apiService.generateChartData(content, type)
          )
        );

        const results = await Promise.all(chartPromises);

        // Create charts from results with performance monitoring
        const chartCreationPromises = results.map(async (result, index) => {
          if (result.success && result.data) {
            const chartType = chartTypes[index];
            const canvasId = `${chartType}Chart`;
            
            return await this.performanceMonitor.measureOperation(`createChart_${chartType}`, async () => {
              switch (chartType) {
                case 'topics':
                  this.chartManager.createTopicChart(canvasId, result.data);
                  break;
                case 'sentiment':
                  this.chartManager.createSentimentChart(canvasId, result.data);
                  break;
                case 'wordFrequency':
                  this.chartManager.createWordFrequencyChart(canvasId, result.data);
                  break;
              }
            });
          }
        });

        await Promise.all(chartCreationPromises);

        this.showToast({
          type: 'success',
          title: 'Charts Generated',
          message: 'Analysis charts have been created.',
        });

      } catch (error) {
        ErrorHandler.logError('Failed to generate charts', error);
        this.showToast({
          type: 'error',
          title: 'Chart Generation Failed',
          message: 'An error occurred while generating charts.',
        });
      } finally {
        this.state.isProcessing = false;
        this.updateUI();
      }
    });
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
    const result = await this.apiService.testConnection();
    
    if (result.success) {
      this.showToast({
        type: 'success',
        title: 'API Connected',
        message: 'Gemini API connection successful.',
        duration: 3000,
      });
    } else {
      this.showToast({
        type: 'error',
        title: 'API Connection Failed',
        message: result.error || 'Unknown error',
      });
    }
  }

  private loadExistingNotes(): void {
    this.state.notes = DataProcessor.getAllNotes();
    this.updateNotesDisplay();
  }

  private updateTranscriptionArea(): void {
    if (this.elements.transcriptionArea) {
      this.elements.transcriptionArea.value = this.transcriptBuffer;
    }
  }

  private updatePolishedNoteArea(): void {
    if (this.elements.polishedNoteArea && this.state.currentNote) {
      this.elements.polishedNoteArea.value = this.state.currentNote.polishedNote;
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
        const recentOperations = this.performanceMonitor.getRecentOperations(5);
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
}
