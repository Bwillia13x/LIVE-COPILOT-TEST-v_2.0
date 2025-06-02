/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, AppState, ToastOptions, ErrorContext } from '../types/index.js';
import { APIService } from '../services/APIService.js';
import { ChartManager } from '../services/ChartManager.js';
import { DataProcessor } from '../services/DataProcessor.js';
import { startOnboardingTourIfNeeded } from '../onboarding.js';
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
  private isSampleData: boolean = false; // Added to track sample data state for charts
  private chartService: any = {}; // Placeholder for actual chart service
  private chartInstances: any = {}; // Placeholder for actual chart instances


  // Performance tracking
  private autoSaveInterval: number | null = null;
  private uiUpdateInterval: number | null = null;

  // DOM element references
  private elements: {
    recordButton?: HTMLButtonElement;
    transcriptionArea?: HTMLDivElement;
    polishedNoteArea?: HTMLDivElement;
    statusDisplay?: HTMLElement;
    chartContainer?: HTMLElement; // This seems to be a general reference, maybe aiChartDisplayArea
    apiKeyInput?: HTMLInputElement;
    notesContainer?: HTMLElement;
    exportButton?: HTMLButtonElement;
  } = {};

  constructor() {
    this.apiService = new APIService();
    this.chartManager = new ChartManager(); // Assuming ChartManager is correctly initialized
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

  private updateChartEmptyState(): void {
    const aiChartDisplayArea = document.getElementById('aiChartDisplayArea');
    const chartEmptyState = document.getElementById('chartEmptyState') as HTMLElement;
    if (aiChartDisplayArea && chartEmptyState) {
      // Check if any chart canvases or containers exist
      const hasCharts = aiChartDisplayArea.querySelector('.chart-container') !== null || aiChartDisplayArea.querySelector('canvas') !== null;
      chartEmptyState.style.display = hasCharts ? 'none' : 'block';
    }
  }

  private async initializeApp(): Promise<void> {
    try {
      this.performanceMonitor.startMonitoring();
      await this.performInitialHealthCheck();
      this.registerLazyModules();
      await this.bundleOptimizer.loadCriticalModules();
      this.setupDOMReferences();
      this.setupEventListeners();
      this.initTheme();
      await this.initializeAPIKey();
      startOnboardingTourIfNeeded();
      this.setupAudioRecorder();
      this.loadExistingNotes();
      this.updateUI();
      this.updateChartEmptyState(); // Initial check for empty state
      this.setupAutoSave();
      this.setupPeriodicUpdates();
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
      transcriptionArea: document.getElementById('rawTranscription') as HTMLDivElement,
      polishedNoteArea: document.getElementById('polishedNote') as HTMLDivElement,
      statusDisplay: document.getElementById('recordingStatus') as HTMLElement,
      chartContainer: document.getElementById('aiChartDisplayArea') as HTMLElement, // General area
      apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement,
      notesContainer: document.getElementById('notesContainer') as HTMLElement, // Assuming this exists for notes list
      exportButton: document.getElementById('confirmExport') as HTMLButtonElement, // Assuming this is the final export button
    };

    const requiredElements = ['recordButton', 'transcriptionArea', 'polishedNoteArea', 'statusDisplay', 'chartContainer', 'apiKeyInput'];
    for (const elementName of requiredElements) {
      if (!this.elements[elementName as keyof typeof this.elements]) {
        console.warn(`Required element '${elementName}' not found in DOM, some functionality might be affected.`);
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
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');

    settingsButton?.addEventListener('click', () => {
      settingsModal?.style.setProperty('display', 'flex');
      const savedApiKey = localStorage.getItem('geminiApiKey');
      if (savedApiKey && this.elements.apiKeyInput) {
        this.elements.apiKeyInput.value = savedApiKey;
      }
      // Update usage stats when opening settings
      this.updateUsageStatisticsDisplay(); 
    });
    closeSettingsModal?.addEventListener('click', () => settingsModal?.style.setProperty('display', 'none'));
    cancelSettings?.addEventListener('click', () => settingsModal?.style.setProperty('display', 'none'));
    saveSettings?.addEventListener('click', () => {
      if (this.elements.apiKeyInput) {
        const apiKey = this.elements.apiKeyInput.value;
        const rememberKey = (document.getElementById('rememberApiKey') as HTMLInputElement)?.checked;
        if (apiKey) {
          if (rememberKey) localStorage.setItem('geminiApiKey', apiKey);
          else localStorage.removeItem('geminiApiKey');
          this.apiService.setApiKey(apiKey);
          this.testAPIConnection();
          startOnboardingTourIfNeeded();
        }
        settingsModal?.style.setProperty('display', 'none');
      }
    });
    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal?.style.setProperty('display', 'none');
    });

    document.getElementById('testChartButton')?.addEventListener('click', () => this.generateCharts());
    document.getElementById('sampleChartsButton')?.addEventListener('click', () => this.generateSampleCharts());
    document.getElementById('newButton')?.addEventListener('click', () => this.clearCurrentNote());
    document.querySelector('[data-tab="note"]')?.addEventListener('click', () => this.switchToPolishedTab());
    document.getElementById('performanceToggleButton')?.addEventListener('click', () => this.togglePerformanceIndicator());
    document.getElementById('themeToggleButton')?.addEventListener('click', () => this.toggleTheme());
    
    // Panels
    const panelConfigs = [
      { buttonId: 'smartSuggestionsButton', panelId: 'smartSuggestionsPanel', closeId: 'closeSuggestions' },
      { buttonId: 'contentLibraryButton', panelId: 'contentLibraryPanel', closeId: 'closeLibrary' },
      { buttonId: 'workflowButton', panelId: 'workflowPanel', closeId: 'closeWorkflow' }
    ];

    panelConfigs.forEach(config => {
      const button = document.getElementById(config.buttonId);
      const panel = document.getElementById(config.panelId);
      const closeButton = document.getElementById(config.closeId);

      button?.addEventListener('click', () => panel?.classList.toggle('open'));
      closeButton?.addEventListener('click', () => panel?.classList.remove('open'));
    });

    const contentInsightsPanel = document.getElementById('contentInsightsPanel');
    const toggleInsightsButton = document.getElementById('toggleInsights');
    const toggleInsightsIcon = toggleInsightsButton?.querySelector('i');
    toggleInsightsButton?.addEventListener('click', () => {
      contentInsightsPanel?.classList.toggle('open');
      const isOpen = contentInsightsPanel?.classList.contains('open');
      toggleInsightsIcon?.classList.toggle('fa-chevron-right', !isOpen);
      toggleInsightsIcon?.classList.toggle('fa-chevron-left', isOpen);
    });

    window.addEventListener('beforeunload', () => this.cleanup());
    window.addEventListener('resize', () => this.chartManager.resizeAllCharts());
  }
  
  private updateUsageStatisticsDisplay(): void {
    const recordingsStartedEl = document.getElementById('statsRecordingsStarted');
    if (recordingsStartedEl) {
      const count = localStorage.getItem('recordingsStarted') || '0';
      recordingsStartedEl.textContent = count;
    }
  }

  private async initializeAPIKey(): Promise<void> {
    try {
      const savedApiKey = localStorage.getItem('geminiApiKey');
      if (savedApiKey) {
        this.apiService.setApiKey(savedApiKey);
        if (this.elements.apiKeyInput) this.elements.apiKeyInput.value = savedApiKey;
        const rememberKeyCheckbox = document.getElementById('rememberApiKey') as HTMLInputElement;
        if (rememberKeyCheckbox) rememberKeyCheckbox.checked = true;
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
    this.audioRecorder.onRecordingStateChange((recordingState) => this.updateRecordingUI(recordingState));
  }

  private async toggleRecording(): Promise<void> {
    try {
      if (!this.audioRecorder.isSupported()) {
        this.showToast({ type: 'error', title: 'Not Supported', message: 'Audio recording is not supported.' });
        return;
      }
      if (this.state.isRecording) {
        this.audioRecorder.stopRecording();
        this.currentTranscript = this.transcriptBuffer.trim();
        this.state.isRecording = false;
        if (this.currentTranscript) {
          this.showToast({ type: 'success', title: 'Recording Complete!', message: "Raw transcription ready! Try 'Polished' view or 'Generate Charts'." });
        }
      } else {
        const success = await this.audioRecorder.startRecording();
        if (success) {
          this.state.isRecording = true;
          this.transcriptBuffer = '';
          
          // Increment and save recordingsStarted count
          let recordingsStarted = parseInt(localStorage.getItem('recordingsStarted') || '0', 10);
          recordingsStarted++;
          localStorage.setItem('recordingsStarted', recordingsStarted.toString());
          this.updateUsageStatisticsDisplay(); // Update display immediately

          this.showToast({ type: 'info', title: 'Recording Started', message: 'Speak now...' });
        } else {
          this.showToast({ type: 'error', title: 'Recording Failed', message: 'Could not start. Check mic permissions.' });
        }
      }
      this.updateUI();
    } catch (error) {
      ErrorHandler.logError('Failed to toggle recording', error);
      this.showToast({ type: 'error', title: 'Recording Error', message: 'Error toggling recording.' });
    }
  }

  private async polishCurrentTranscription(): Promise<void> {
    try {
      if (!this.currentTranscript) {
        this.showToast({ type: 'warning', title: 'No Transcription', message: 'Please record something first.' });
        return;
      }
      if (!this.apiService.hasValidApiKey()) {
        this.showToast({ type: 'warning', title: 'API Key Required', message: 'Please enter your Gemini API key.' });
        return;
      }
      this.state.isProcessing = true;
      this.updateUI();
      const result = await this.performanceMonitor.measureOperation(
        () => this.apiService.polishTranscription(this.currentTranscript),
        'apiResponseTime', 'PolishTranscription'
      );
      if (result.success && result.data) {
        this.state.currentNote = {
          id: Date.now().toString(),
          rawTranscription: this.currentTranscript,
          polishedNote: result.data,
          timestamp: Date.now(),
        };
        this.updatePolishedNoteArea();
        this.showToast({ type: 'success', title: 'AI Polishing Complete!', message: 'Your notes have been refined by AI.' });
      } else {
        this.showToast({ type: 'error', title: 'Polishing Failed', message: result.error || 'Unknown error.' });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to polish transcription', error);
      this.showToast({ type: 'error', title: 'Processing Error', message: 'Error polishing transcription.' });
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  private async generateCharts(): Promise<void> {
    const chartLoadingIndicator = document.getElementById('chartLoadingIndicator');
    const chartEmptyState = document.getElementById('chartEmptyState') as HTMLElement;
    const aiChartDisplayArea = document.getElementById('aiChartDisplayArea');

    if (aiChartDisplayArea) {
      Array.from(aiChartDisplayArea.getElementsByClassName('chart-container')).forEach(el => el.remove());
    }
    if (chartEmptyState) chartEmptyState.style.display = 'none';
    if (chartLoadingIndicator) chartLoadingIndicator.style.display = 'block';
    
    try {
      // Use a more descriptive variable for full transcription if available, otherwise use currentTranscript
      const textForCharts = this.state.currentNote?.polishedNote || this.currentTranscript || this.transcriptBuffer;
      if (!textForCharts) {
          this.showToast({type: 'warning', title: 'No Content', message: 'No content available for chart generation.'});
          if (chartLoadingIndicator) chartLoadingIndicator.style.display = 'none';
          this.updateChartEmptyState();
          return;
      }

      const chartData = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateChartData(textForCharts), // Use appropriate text
        'apiResponseTime', 'generateChartData'
      );

      if (chartData && Object.keys(chartData).length > 0) {
        this.chartManager.destroyAllCharts(); // Clear previous before creating new
        const chartTypes = Object.keys(chartData) as (keyof typeof chartData)[];
        for (const type of chartTypes) {
          const specificChartData = chartData[type];
          if (specificChartData) {
             this.createChartContainer(`${type}Chart-${Date.now()}`, this.getChartTitle(type), this.getChartDescription(type)); // Ensure unique IDs
             await this.chartManager.createChart(`${type}Chart-${Date.now()}`, specificChartData.type || 'bar', specificChartData);
          }
        }
      } else {
          this.showToast({type: 'info', title: 'No Charts Generated', message: 'Could not generate charts for the current content.'});
      }
    } catch (error) {
      ErrorHandler.logError('Failed to generate charts', error);
      this.showToast({ type: 'error', title: 'Chart Error', message: 'Error generating charts.' });
    } finally {
      if (chartLoadingIndicator) chartLoadingIndicator.style.display = 'none';
      this.updateChartEmptyState();
      this.state.isProcessing = false;
      this.updateUI();
    }
  }
  
  private async generateSampleCharts(): Promise<void> {
    const chartLoadingIndicator = document.getElementById('chartLoadingIndicator');
    const chartEmptyState = document.getElementById('chartEmptyState') as HTMLElement;
    const aiChartDisplayArea = document.getElementById('aiChartDisplayArea');
    
    if (aiChartDisplayArea) {
        Array.from(aiChartDisplayArea.getElementsByClassName('chart-container')).forEach(el => el.remove());
    }
    if (chartEmptyState) chartEmptyState.style.display = 'none';
    if (chartLoadingIndicator) chartLoadingIndicator.style.display = 'block';

    try {
      const sampleChartData = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateSampleChartData(),
        'apiResponseTime', 'generateSampleChartData'
      );
      if (sampleChartData && Object.keys(sampleChartData).length > 0) {
        this.chartManager.destroyAllCharts(); // Clear previous
        const chartTypes = Object.keys(sampleChartData) as (keyof typeof sampleChartData)[];
        for (const type of chartTypes) {
          const specificChartData = sampleChartData[type];
          if (specificChartData) {
            this.createChartContainer(`${type}SampleChart-${Date.now()}`, this.getChartTitle(type), `Sample: ${this.getChartDescription(type)}`);
            await this.chartManager.createChart(`${type}SampleChart-${Date.now()}`, specificChartData.type || 'bar', specificChartData);
          }
        }
      } else {
         this.showToast({type: 'info', title: 'No Sample Charts', message: 'Could not retrieve sample chart data.'});
      }
    } catch (error) {
      ErrorHandler.logError('Failed to generate sample charts', error);
      this.showToast({ type: 'error', title: 'Sample Chart Error', message: 'Error generating sample charts.' });
    } finally {
      if (chartLoadingIndicator) chartLoadingIndicator.style.display = 'none';
      this.updateChartEmptyState();
      this.state.isProcessing = false;
      this.updateUI();
    }
  }


  private saveCurrentNote(): void {
    try {
      if (!this.state.currentNote) {
        this.showToast({ type: 'warning', title: 'No Note', message: 'There is no note to save.' });
        return;
      }
      DataProcessor.saveNote(this.state.currentNote);
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();
      this.showToast({ type: 'success', title: 'Note Saved', message: 'Note saved successfully.' });
    } catch (error) {
      ErrorHandler.logError('Failed to save note', error);
      this.showToast({ type: 'error', title: 'Save Failed', message: 'Failed to save the note.' });
    }
  }

  private clearCurrentNote(): void {
    this.currentTranscript = '';
    this.transcriptBuffer = '';
    this.state.currentNote = null;
    this.chartManager.destroyAllCharts(); // This should handle removing chart canvases
    if(this.elements.transcriptionArea) this.elements.transcriptionArea.textContent = '';
    if(this.elements.polishedNoteArea) this.elements.polishedNoteArea.textContent = '';
    this.updateUI();
    this.updateChartEmptyState();
    this.showToast({ type: 'info', title: 'Cleared', message: 'Current note and charts cleared.' });
  }

  private exportNotes(): void {
    try {
      const format = 'markdown'; 
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
        this.showToast({ type: 'success', title: 'Export Complete', message: 'Notes exported.' });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to export notes', error);
      this.showToast({ type: 'error', title: 'Export Failed', message: 'Failed to export notes.' });
    }
  }

  private async testAPIConnection(): Promise<void> {
    try {
      const result = await this.apiService.testConnection();
      if (result.success) {
        this.showToast({ type: 'success', title: 'API Connected', message: 'Gemini API connection successful.', duration: 3000 });
      } else if (!result.error?.includes('API Key must be set')) {
        this.showToast({ type: 'error', title: 'API Connection Failed', message: result.error || 'Unknown error' });
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
      this.elements.polishedNoteArea.classList.add('highlight-polished-note');
      setTimeout(() => {
        this.elements.polishedNoteArea?.classList.remove('highlight-polished-note');
      }, 2000);
    }
  }

  private updateRecordingUI(recordingState: RecordingState): void {
    const recordButtonInner = this.elements.recordButton?.querySelector('.record-button-inner');
    const recordText = this.elements.recordButton?.querySelector('.record-text');
    const icon = recordButtonInner?.querySelector('i');

    if (recordButtonInner && recordText && icon && this.elements.recordButton) {
      if (recordingState.isRecording) {
        this.elements.recordButton.classList.add('recording');
        icon.className = 'fas fa-stop';
        (recordText as HTMLElement).textContent = recordingState.isPaused ? 'Paused' : 'Stop';
      } else {
        this.elements.recordButton.classList.remove('recording');
        icon.className = 'fas fa-microphone';
        (recordText as HTMLElement).textContent = 'Record';
      }
    }

    if (this.elements.statusDisplay) {
      if (recordingState.isRecording) {
        const duration = this.audioRecorder.formatDuration(recordingState.duration);
        const status = recordingState.isPaused ? 'Paused' : 'Recording...';
        this.elements.statusDisplay.textContent = `${status} ${duration}`;
      } else {
        this.elements.statusDisplay.textContent = 'Ready to record';
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

  private createNoteElement(note: Note): HTMLElement { // Changed 'any' to 'Note'
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.innerHTML = `
      <div class="note-header">
        <h3>${(note as any).title || 'Untitled Note'}</h3> 
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
    if (this.elements.recordButton) {
      this.elements.recordButton.disabled = this.state.isProcessing;
    }
    const processingElements = document.querySelectorAll('.processing-indicator');
    processingElements.forEach(el => {
      (el as HTMLElement).style.display = this.state.isProcessing ? 'block' : 'none';
    });
  }

  private showToast(options: ToastOptions): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type}`;
    toast.innerHTML = `
      <div class="toast-title">${options.title}</div>
      <div class="toast-message">${options.message}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), options.duration || 5000);
  }
  
  private logMessage(message: string, context?: ErrorContext): void { // Added method from previous context
    console.log(message, context || '');
  }

  private showLoading(message: string): void { // Added method from previous context
    // This can be a more sophisticated UI element if needed
    console.log(`Loading: ${message}`);
    if (this.elements.statusDisplay) {
      this.elements.statusDisplay.textContent = message;
    }
  }


  private cleanup(): void {
    console.log('🧹 Starting application cleanup...');
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
    this.performanceMonitor.cleanup();
    this.intervalManager.cleanup();
    this.bundleOptimizer.cleanup();
    this.audioRecorder.cleanup();
    this.chartManager.destroyAllCharts();
    MemoryManager.cleanup();
    console.log('✅ Application cleanup completed');
  }

  private registerLazyModules(): void {
    this.bundleOptimizer.registerLazyModule('charting', async () => ({ Chart: (await import('chart.js')).Chart }));
    this.bundleOptimizer.registerLazyModule('fileProcessing', async () => {
      const [mammoth, tesseract, pdfjsLib] = await Promise.all([
        import('mammoth'), import('tesseract.js'), import('pdfjs-dist')
      ]);
      return { mammoth, tesseract, pdfjsLib };
    });
    this.bundleOptimizer.registerLazyModule('advancedFeatures', async () => ({}));
  }

  private setupAutoSave(): void {
    this.autoSaveInterval = this.intervalManager.createRecurringTask('AutoSave', 30000, () => {
      if (this.state.currentNote && !this.state.isProcessing) {
        this.performanceMonitor.measureOperation(() => DataProcessor.saveNote(this.state.currentNote!), 'renderTime', 'AutoSave');
      }
    }, { onError: (error) => console.warn('Auto-save failed:', error) });
  }

  private setupPeriodicUpdates(): void {
    this.uiUpdateInterval = this.intervalManager.createRecurringTask('UIUpdate', 10000, () => this.updatePerformanceUI());
  }

  private updatePerformanceUI(): void {
    const performanceIndicator = document.getElementById('performanceIndicator');
    if (!performanceIndicator || performanceIndicator.style.display === 'none') return;
    const metrics = this.performanceMonitor.getLatestMetrics();
    const alerts = this.performanceMonitor.getAlerts();
    if (metrics) {
      const memoryElement = document.getElementById('memoryUsage');
      if (memoryElement) memoryElement.textContent = `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`;
      const cpuElement = document.getElementById('cpuUsage');
      if (cpuElement) {
        const recentOperations = this.performanceMonitor.getRecentOperations();
        const avgDuration = recentOperations.length > 0 ? recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length : 0;
        cpuElement.textContent = `${Math.min(100, Math.round(avgDuration / 10))}%`;
      }
      const frameRateElement = document.getElementById('frameRate');
      if (frameRateElement) frameRateElement.textContent = `${Math.round(metrics.frameRate)}`;
      const performanceAlert = document.getElementById('performanceAlert');
      const performanceAlertText = document.getElementById('performanceAlertText');
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
      if (criticalAlerts.length > 0 && performanceAlert && performanceAlertText) {
        performanceAlertText.textContent = criticalAlerts[criticalAlerts.length - 1].message;
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
      performanceIndicator.style.display = isVisible ? 'none' : 'block';
      performanceToggleButton?.classList.toggle('active', !isVisible);
      if (!isVisible) this.updatePerformanceUI();
    }
  }

  public loadNote(noteId: string): void {
    const note = this.state.notes.find(n => n.id === noteId);
    if (note) {
      this.state.currentNote = note;
      this.currentTranscript = note.rawTranscription;
      this.transcriptBuffer = note.rawTranscription; // Also update buffer
      this.updateTranscriptionArea();
      this.updatePolishedNoteArea();
      this.chartManager.destroyAllCharts(); // Clear old charts
      this.updateChartEmptyState(); // Update based on cleared charts
    }
  }

  public deleteNote(noteId: string): void {
    if (DataProcessor.deleteNote(noteId)) {
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();
      if (this.state.currentNote?.id === noteId) { // If current note was deleted
          this.clearCurrentNote(); // This will also update chart empty state
      }
      this.showToast({ type: 'success', title: 'Note Deleted', message: 'The note has been deleted.' });
    }
  }

  private async performInitialHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.healthCheckService.getHealthStatus();
      if (healthStatus.status === 'unhealthy') {
        this.showToast({ type: 'warning', title: 'System Health Warning', message: 'Some checks failed.' });
      }
      if (this.productionMonitor) {
        this.productionMonitor.trackEvent('health_check', { status: healthStatus.status });
      }
    } catch (error) {
      ErrorHandler.logError('Health check failed', error);
      this.showToast({ type: 'error', title: 'Health Check Failed', message: 'Unable to verify system health.' });
    }
  }

  public async getHealthStatus() {
    return await this.healthCheckService.getHealthStatus();
  }

  private createChartContainer(canvasId: string, title: string, description: string): void {
    const chartDisplayArea = document.getElementById('aiChartDisplayArea');
    if (!chartDisplayArea) {
      console.error('Chart display area not found');
      return;
    }
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container chart-fade-in';
    chartContainer.innerHTML = `
      <div class="chart-header"><h4>${title}</h4><p class="chart-description">${description}</p></div>
      <canvas id="${canvasId}" width="400" height="200"></canvas>
    `;
    chartDisplayArea.appendChild(chartContainer);
  }

  private getChartTitle(chartType: string): string {
    const titles: { [key: string]: string } = {
      topics: 'Topic Distribution', sentiment: 'Sentiment Analysis', wordFrequency: 'Word Frequency'
    };
    return titles[chartType] || 'Chart';
  }

  private getChartDescription(chartType: string): string {
    const descriptions: { [key: string]: string } = {
      topics: 'Main topics in your transcription',
      sentiment: 'Emotional tone of your content',
      wordFrequency: 'Most frequent words'
    };
    return descriptions[chartType] || 'Data visualization';
  }
}
