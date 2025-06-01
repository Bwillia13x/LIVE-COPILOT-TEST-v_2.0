/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, AppState, ErrorContext, AllAIChartData, AIChartDataPayload, TopicDataInput, SentimentDataInput, WordFrequencyInput } from '../types/index.js';
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
import { ErrorHandler, MemoryManager, showToast as utilShowToast } from '../utils.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, STORAGE_KEYS, UI_IDS, APP_CONFIG, CHART_TYPES } from '../constants.js';

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
      this.setupAutoSave();
      this.setupPeriodicUpdates();
      await this.testAPIConnection();
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
    };
    const requiredElementIds = ['recordButton', UI_IDS.CONTENT_PANE_RAW, UI_IDS.CONTENT_PANE_POLISHED];
    for (const elementId of requiredElementIds) {
        if (!document.getElementById(elementId)) { // Check directly if element exists
             throw new Error(`Required element '${elementId}' not found in DOM`);
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
    window.addEventListener('beforeunload', () => this.cleanup());
    window.addEventListener('resize', this.handleResize);
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
    this.audioRecorder.onRecordingStateChange((recordingState) => this.updateRecordingUI(recordingState));
  }

  private async toggleRecording(): Promise<void> {
    try {
      if (!this.audioRecorder.isSupported()) {
        utilShowToast({ type: 'error', title: 'Not Supported', message: ERROR_MESSAGES.MICROPHONE.NOT_SUPPORTED });
        return;
      }
      if (this.state.isRecording) {
        this.audioRecorder.stopRecording();
        this.currentTranscript = this.transcriptBuffer.trim();
        this.state.isRecording = false;
        if (this.currentTranscript) {
          utilShowToast({ type: 'success', title: 'Recording Complete', message: 'Transcription ready for polishing.' });
        }
      } else {
        const success = await this.audioRecorder.startRecording();
        if (success) {
          this.state.isRecording = true;
          this.transcriptBuffer = '';
          utilShowToast({ type: 'info', title: 'Recording Started', message: 'Speak now...' });
        } else {
          utilShowToast({ type: 'error', title: 'Recording Failed', message: ERROR_MESSAGES.MICROPHONE.GENERIC_ERROR });
        }
      }
      this.updateUI();
    } catch (error) {
      this._handleOperationError(error, 'toggleRecording', 'Recording Error', 'An error occurred while toggling recording');
    }
  }

  private async polishCurrentTranscription(): Promise<void> {
    try {
      if (!this.currentTranscript) {
        utilShowToast({ type: 'warning', title: 'No Transcription', message: 'Please record something first.' });
        return;
      }
      if (!this.apiService.hasValidApiKey()) {
        utilShowToast({ type: 'warning', title: 'API Key Required', message: ERROR_MESSAGES.API.API_KEY_MISSING });
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
          id: Date.now().toString(), rawTranscription: this.currentTranscript,
          polishedNote: result.data, timestamp: Date.now(),
        };
        this.updatePolishedNoteArea();
        utilShowToast({ type: 'success', title: 'Polishing Complete', message: 'Your transcription has been improved.' });
      } else {
        utilShowToast({ type: 'error', title: 'Polishing Failed', message: result.error || 'Unknown error occurred.' });
      }
    } catch (error) {
      this._handleOperationError(error, 'polishCurrentTranscription', 'Processing Error', 'An error occurred while polishing the transcription');
    } finally {
      this.state.isProcessing = false;
      this.updateUI();
    }
  }

  private async generateCharts(): Promise<void> {
    if (this.isSampleData) {
        console.log("generateCharts called while isSampleData is true; AI chart generation skipped.");
        this.isSampleData = false;
        return;
    }
    console.log('Generating charts from AI...');
    this.state.isProcessing = true; this.updateUI();
    try {
      const textToAnalyze = this.fullTranscription || this.currentTranscript;
      if (!textToAnalyze) {
          ErrorHandler.logWarning('No transcription data available to generate AI charts.', 'generateCharts');
          utilShowToast({ type: 'warning', title: 'Missing Data', message: 'No transcription data available for AI chart generation.' });
          this.state.isProcessing = false; this.updateUI(); return;
      }
      const chartDataResponse = await this.performanceMonitor.measureOperation(
        () => this.apiService.generateChartData(textToAnalyze, CHART_TYPES.ALL),
        'apiResponseTime', 'generateChartData_AI'
      );
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
      if (!this.state.currentNote) {
        utilShowToast({ type: 'warning', title: 'No Note', message: 'There is no note to save.' });
        return;
      }
      DataProcessor.saveNote(this.state.currentNote);
      this.state.notes = DataProcessor.getAllNotes();
      this.updateNotesDisplay();
      utilShowToast({ type: 'success', title: 'Note Saved', message: 'Your note has been saved successfully.' });
    } catch (error) {
      this._handleOperationError(error, 'saveCurrentNote', 'Save Failed', 'Failed to save the note');
    }
  }

  private clearCurrentNote(): void {
    this.currentTranscript = ''; this.transcriptBuffer = '';
    this.state.currentNote = null;
    this.chartManager.destroyAllCharts(); this.updateUI();
    utilShowToast({ type: 'info', title: 'Cleared', message: 'Current note and charts have been cleared.' });
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
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        if (result.error?.includes(ERROR_MESSAGES.API.API_KEY_MISSING)) {
          console.log('ℹ️ No API key configured - user can set one in settings');
        } else {
          utilShowToast({ type: 'error', title: 'API Connection Failed', message: result.error || 'Unknown error' });
        }
      }
    } catch (error) {
      ErrorHandler.logError('API connection test failed', error);
    }
  }

  private loadExistingNotes(): void {
    this.state.notes = DataProcessor.getAllNotes(); this.updateNotesDisplay();
  }

  private updateTranscriptionArea(): void {
    if (this.elements.transcriptionArea) this.elements.transcriptionArea.textContent = this.transcriptBuffer;
  }

  private updatePolishedNoteArea(): void {
    if (this.elements.polishedNoteArea && this.state.currentNote) this.elements.polishedNoteArea.textContent = this.state.currentNote.polishedNote;
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
        this.elements.statusDisplay.textContent = `${recordingState.isPaused ? 'Paused' : 'Recording'} - ${duration}`;
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

  private createNoteElement(note: StoredNote): HTMLElement { // Changed note: any to note: StoredNote
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.innerHTML = `
      <div class="note-header"><h3>${note.title}</h3><span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span></div>
      <div class="note-content">${note.polishedNote.substring(0, 200)}...</div>
      <div class="note-actions"><button onclick="app.loadNote('${note.id}')">Load</button><button onclick="app.deleteNote('${note.id}')">Delete</button></div>
    `;
    return noteDiv;
  }

  private updateUI(): void {
    if (this.elements.recordButton) this.elements.recordButton.disabled = this.state.isProcessing;
    document.querySelectorAll('.processing-indicator').forEach(el => (el as HTMLElement).style.display = this.state.isProcessing ? 'block' : 'none');
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
      if (this.state.currentNote && !this.state.isProcessing) {
        this.performanceMonitor.measureOperation(() => DataProcessor.saveNote(this.state.currentNote!), 'renderTime', 'AutoSave');
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
    const note = this.state.notes.find(n => n.id === noteId);
    if (note) {
      this.state.currentNote = note; this.currentTranscript = note.rawTranscription;
      this.updateTranscriptionArea(); this.updatePolishedNoteArea();
    }
  }

  public deleteNote(noteId: string): void {
    if (DataProcessor.deleteNote(noteId)) {
      this.state.notes = DataProcessor.getAllNotes(); this.updateNotesDisplay();
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

  private _handleOperationError(error: any, operationName: string, userFriendlyTitle: string, userFriendlyMessagePrefix: string): void {
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

  private createChartContainer(canvasId: string, title: string, description: string): void {
    const chartDisplayArea = document.getElementById(UI_IDS.CHART_DISPLAY_AREA);
    if (!chartDisplayArea) {
      console.error(`Chart display area '${UI_IDS.CHART_DISPLAY_AREA}' not found for canvasId: ${canvasId}`);
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
}
