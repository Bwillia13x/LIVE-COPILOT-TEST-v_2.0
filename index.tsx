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

// Enhanced file processing imports
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Enhanced imports for Gemma integration (commented out for now)
// import { GemmaIntegration } from './src/gemma-integration.js';
// import { EnhancedVoiceNotesApp } from './src/enhanced-voice-app.js';
// import { getOptimizedConfig, validateConfig, getDeviceRecommendations } from './src/gemma-config.js';

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

// Enhanced Error Handling and User Feedback System
interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

interface ErrorContext {
  operation: string;
  details?: any;
  userMessage: string;
  retryable: boolean;
  retryAction?: () => void;
}

// Enhanced storage and export functionality interfaces
interface StoredNote {
  id: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
  title: string;
  isAutoSaved: boolean;
}

interface ExportOptions {
  format: 'markdown' | 'plain' | 'html';
  includeRaw: boolean;
  includeCharts: boolean;
}

// Performance Optimization Interfaces
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PerformanceMetrics {
  apiCallDuration: number[];
  transcriptionProcessingTime: number[];
  chartRenderingTime: number[];
  waveformDrawCount: number;
  memoryUsage: number[];
}

// Priority 2: Advanced Analytics & Intelligence Interfaces
interface SessionAnalytics {
  startTime: number;
  endTime?: number;
  duration: number;
  wordsTranscribed: number;
  averageConfidence: number;
  speakingRate: number; // words per minute
  pauseCount: number;
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  contentType: 'meeting' | 'lecture' | 'notes' | 'brainstorm' | 'general';
}

interface ContentAnalysis {
  topics: string[];
  keyPhrases: string[];
  sentiment: {
    score: number; // -1 to 1
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  contentType: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  actionItems: string[];
}

interface AdvancedExportOptions {
  format: 'markdown' | 'html' | 'pdf' | 'docx';
  includePolished: boolean;
  includeRaw: boolean;
  includeCharts: boolean;
  includeAnalytics: boolean;
  includeMetadata: boolean;
}

interface SmartSuggestions {
  nextActions: string[];
  relatedTopics: string[];
  improvementTips: string[];
  exportRecommendations: string[];
}

interface AIResponse {
  polishedNoteText: string;
  chartSuggestion?: any;
}

// Interface for keyword highlighting configuration
interface KeywordHighlightConfig {
  words: string[];
  className: string;
  color: string;
}

// Priority 4: Multi-modal Integration & Advanced Workflows Interfaces
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  content?: string;
  extractedText?: string;
  metadata?: Record<string, any>;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  thumbnail?: string;
}

interface WorkflowAction {
  id: string;
  type: 'summarize' | 'translate' | 'format' | 'export' | 'notify' | 'custom';
  parameters: Record<string, any>;
  description: string;
}

interface WorkflowTrigger {
  id: string;
  type: 'content_change' | 'file_upload' | 'keyword_detected' | 'time_based' | 'manual';
  conditions: Record<string, any>;
  description: string;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  createdDate: Date;
  lastExecuted?: Date;
  executionCount: number;
  successRate: number;
}

interface MultiModalContent {
  id: string;
  type: 'voice' | 'file' | 'combined';
  content: string;
  metadata: {
    source: string;
    timestamp: Date;
    processingTime: number;
    confidence?: number;
  };
  files: UploadedFile[];
  insights: {
    topics: string[];
    sentiment: string;
    complexity: number;
    readability: number;
    actionItems: string[];
  };
}

interface CloudIntegration {
  provider: 'google_drive' | 'dropbox' | 'onedrive' | 'custom';
  isEnabled: boolean;
  config: Record<string, any>;
  lastSync?: Date;
}

interface OfflineQueueItem {
  id: string;
  type: 'file_upload' | 'content_analysis' | 'workflow_execution' | 'export';
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Performance Configuration
const PERFORMANCE_CONFIG = {
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 16, // ~60fps
  MAX_CACHE_SIZE: 50,
  MAX_METRICS_ENTRIES: 100,
  WAVEFORM_THROTTLE: 32, // ~30fps for waveform
  AI_REQUEST_TIMEOUT: 30000, // 30 seconds
  BATCH_SIZE: 5
};

// Priority 5: Enterprise Features & Production Deployment Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  workspaceId: string;
  lastActive: Date;
  preferences: UserPreferences;
  permissions: string[];
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  workflowUpdates: boolean;
  collaborationActivity: boolean;
}

interface PrivacySettings {
  shareAnalytics: boolean;
  allowMentions: boolean;
  visibleToTeam: boolean;
  sharePresence: boolean;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: Date;
  plan: 'free' | 'pro' | 'enterprise';
  usage: WorkspaceUsage;
}

interface WorkspaceMember {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
  invitedBy: string;
  permissions: string[];
}

interface WorkspaceSettings {
  allowPublicSharing: boolean;
  requireApprovalForNewMembers: boolean;
  retentionPolicy: number;
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  integrations: Record<string, any>;
}

interface WorkspaceUsage {
  storageUsed: number;
  storageLimit: number;
  activeUsers: number;
  monthlyTranscriptionMinutes: number;
  apiCallsThisMonth: number;
}

interface Comment {
  id: string;
  noteId: string;
  userId: string;
  content: string;
  timestamp: number;
  createdAt: Date;
  updatedAt?: Date;
  parentId?: string;
  mentions: string[];
  reactions: CommentReaction[];
  resolved: boolean;
}

interface CommentReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

interface CollaborationSession {
  noteId: string;
  participants: CollaborationParticipant[];
  startedAt: Date;
  lastActivity: Date;
  cursors: Map<string, CursorPosition>;
  selections: Map<string, TextSelection>;
}

interface CollaborationParticipant {
  userId: string;
  joinedAt: Date;
  isActive: boolean;
  cursor?: CursorPosition;
  selection?: TextSelection;
  color: string;
}

interface CursorPosition {
  position: number;
  visible: boolean;
  timestamp: Date;
}

interface TextSelection {
  start: number;
  end: number;
  timestamp: Date;
}

interface CloudStorage {
  provider: 'googledrive' | 'dropbox' | 'onedrive' | 'custom';
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  quotaUsed: number;
  quotaTotal: number;
  lastSync?: Date;
  syncEnabled: boolean;
}

interface SyncConflict {
  id: string;
  noteId: string;
  conflictType: 'content' | 'metadata' | 'deletion';
  localVersion: any;
  remoteVersion: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merged';
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: 'note' | 'workflow' | 'user' | 'workspace';
  resourceId: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: Date;
  expiresAt?: Date;
  createdBy: string;
  rateLimitTier: 'basic' | 'premium' | 'enterprise';
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggered?: Date;
  failureCount: number;
  maxRetries: number;
  retryBackoff: number;
}

interface TeamAnalytics {
  workspaceId: string;
  period: 'day' | 'week' | 'month' | 'year';
  metrics: TeamMetrics;
  generatedAt: Date;
}

interface TeamMetrics {
  totalTranscriptions: number;
  totalMinutes: number;
  activeUsers: number;
  averageSessionLength: number;
  topUsers: UserMetric[];
  contentTypes: Record<string, number>;
  exportCounts: Record<string, number>;
  workflowExecutions: number;
}

interface UserMetric {
  userId: string;
  transcriptionCount: number;
  totalMinutes: number;
  averageConfidence: number;
  lastActive: Date;
}

interface EncryptionKey {
  id: string;
  purpose: 'content' | 'files' | 'communications';
  algorithm: string;
  keyData: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface ComplianceReport {
  id: string;
  workspaceId: string;
  reportType: 'gdpr' | 'audit' | 'retention' | 'security';
  period: { start: Date; end: Date };
  data: Record<string, any>;
  generatedAt: Date;
  generatedBy: string;
  status: 'generating' | 'ready' | 'error';
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
  private autoSaveIndicator: HTMLDivElement;

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private waveformDataArray: Uint8Array | null = null;
  private waveformDrawingId: number | null = null;
  private timerIntervalId: number | null = null;
  private recordingStartTime: number = 0;
  private activeAiChartInstances: Chart[] = []; // Store multiple chart instances
  private chartIdCounter = 0; // Counter for unique chart IDs

  // Storage and export functionality properties
  private noteHistory: StoredNote[] = [];
  private autoSaveIntervalId: number | null = null;
  private performanceOptimizationInterval: number | null = null; // Prevent duplicate performance intervals
  private maxStoredNotes = 50;

  // Enhanced Error Handling Properties
  private toastContainer: HTMLDivElement | null = null;
  private networkStatus: HTMLDivElement | null = null;
  private permissionOverlay: HTMLDivElement | null = null;
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  private isOnline = navigator.onLine;

  // Performance Optimization Properties
  private responseCache = new Map<string, CacheEntry<AIResponse>>();
  private performanceMetrics: PerformanceMetrics = {
    apiCallDuration: [],
    transcriptionProcessingTime: [],
    chartRenderingTime: [],
    waveformDrawCount: 0,
    memoryUsage: []
  };
  private debouncedUpdateTranscription: ((text: string) => void) | null = null;
  private throttledDrawWaveform: (() => void) | null = null;
  private throttledUpdateTimer: (() => void) | null = null;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastWaveformDraw = 0;
  private lastTimerUpdate = 0;
  private observedElements = new Set<Element>();
  private intersectionObserver: IntersectionObserver | null = null;

  // Gemma 3n E4B Integration Properties (commented out for now)
  // private gemmaIntegration: GemmaIntegration | null = null;
  // private isGemmaEnabled = false;
  // private realtimeChartBuffer: string = '';
  // private lastRealtimeAnalysis = 0;
  // private realtimeAnalysisInterval = 3000; // Analyze every 3 seconds

  // Priority 1 UX Enhancement Properties
  private confidenceIndicator: HTMLDivElement | null = null;
  private confidenceLevel: HTMLDivElement | null = null;
  private confidenceText: HTMLSpanElement | null = null;
  private voiceActivityIndicator: HTMLDivElement | null = null;
  private voiceActivityBars: NodeListOf<HTMLDivElement> | null = null;
  private currentConfidence = 0;
  private lastVoiceActivity = 0;
  private voiceActivityThreshold = 50; // Minimum audio level for voice detection

  // Keyword highlighting configuration
  private keywordHighlights: KeywordHighlightConfig[] = [
    { words: ['important', 'critical', 'urgent', 'priority'], className: 'important', color: '#ff9f0a' },
    { words: ['action', 'todo', 'task', 'complete', 'finish'], className: 'action', color: '#32d74b' },
    { words: ['today', 'tomorrow', 'deadline', 'schedule', 'meeting'], className: 'temporal', color: '#c792ea' },
    { words: ['decision', 'choose', 'option', 'alternative'], className: 'default', color: '#82aaff' }
  ];

  private confidenceUpdateThrottle: number | null = null;

  // Priority 2: Advanced Analytics & Intelligence Properties
  private currentSession: SessionAnalytics | null = null;
  private sessionHistory: SessionAnalytics[] = [];
  private analyticsPanel: HTMLDivElement | null = null;
  private exportModal: HTMLDivElement | null = null;
  private contentAnalysis: ContentAnalysis | null = null;
  private speechMetrics = {
    wordsPerMinute: 0,
    totalWords: 0,
    totalPauses: 0,
    confidenceSum: 0,
    confidenceCount: 0
  };
  private pauseDetectionThreshold = 1000; // ms
  private lastWordTime = 0;
  private topicDetectionModel: any = null; // For future ML integration

  // Priority 3: Advanced AI Integration & Real-time Intelligence Properties
  private smartSuggestions: SmartSuggestions | null = null;
  private suggestionUpdateInterval: number | null = null;
  private lastSuggestionUpdate = 0;
  private suggestionThrottle = 5000; // Update suggestions every 5 seconds
  private noteSearchIndex: Map<string, Set<string>> = new Map(); // For semantic search
  private realtimeProcessor: any = null; // Will be enhanced later
  private contentInsightsPanel: HTMLDivElement | null = null;
  private lastContentLength = 0;
  private smartSuggestionsPanel: HTMLDivElement | null = null;
  private smartSuggestionsButton: HTMLButtonElement | null = null;
  private semanticSearchInput: HTMLInputElement | null = null;
  private searchResults: HTMLDivElement | null = null;
  private isRealTimeProcessingActive = false;
  private contentAnalysisQueue: string[] = [];
  private processingTimer: number | null = null;

  // Priority 4: Multi-modal Integration & Advanced Workflows Properties
  private uploadedFiles: Map<string, UploadedFile> = new Map();
  private automationWorkflows: Map<string, AutomationWorkflow> = new Map();
  private multiModalContent: MultiModalContent | null = null;
  private fileDropZone: HTMLDivElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private contentLibraryPanel: HTMLDivElement | null = null;
  private contentLibraryButton: HTMLButtonElement | null = null;
  private workflowPanel: HTMLDivElement | null = null;
  private workflowButton: HTMLButtonElement | null = null;
  private filesList: HTMLDivElement | null = null;
  private workflowsList: HTMLDivElement | null = null;
  private processingIndicator: HTMLDivElement | null = null;
  private cloudIntegrations: Map<string, CloudIntegration> = new Map();
  private offlineQueue: OfflineQueueItem[] = [];
  private isOfflineMode = false;
  private fileProcessingWorker: Worker | null = null;
  private dragCounter = 0;

  // Priority 5: Enterprise Features & Production Deployment Properties
  private currentUser: User | null = null;
  private currentWorkspace: Workspace | null = null;
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private cloudStorageProviders: Map<string, CloudStorage> = new Map();
  private syncConflicts: SyncConflict[] = [];
  private auditLog: AuditLogEntry[] = [];
  private apiKeys: Map<string, APIKey> = new Map();
  private webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
  private teamAnalytics: TeamAnalytics | null = null;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private complianceReports: Map<string, ComplianceReport> = new Map();
  private websocketConnection: WebSocket | null = null;
  private collaborationTimer: number | null = null;
  private presenceUpdateInterval: number | null = null;
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;

  constructor() {
    console.log('VoiceNotesApp constructor called');
    
    // Debug environment variables
    console.log('🔍 All import.meta.env:', import.meta.env);
    console.log('🔍 Environment keys:', Object.keys(import.meta.env));
    console.log('🔍 VITE_GEMINI_API_KEY specifically:', import.meta.env.VITE_GEMINI_API_KEY);
    
    // Make AI initialization optional for now
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDE1gzCeTw42daw84Y-Lh_P7XurdLCZHoI';
    console.log('🔍 Environment API Key (import.meta.env.VITE_GEMINI_API_KEY):', import.meta.env.VITE_GEMINI_API_KEY);
    console.log('🔍 Final API Key used:', apiKey ? apiKey.substring(0, 12) + '...' : 'null');
    console.log('🔍 API Key length:', apiKey ? apiKey.length : 0);
    
    if (apiKey) {
      try {
        // Try different initialization approaches for browser compatibility
        console.log('🔍 Trying to initialize GoogleGenAI with key length:', apiKey.length);
        
        // Method 1: Standard initialization
        this.genAI = new GoogleGenAI(apiKey);
        console.log('✅ AI service initialized successfully with key:', apiKey.substring(0, 8) + '...');
        
        // Test the service immediately to catch API key issues early
        try {
          const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          console.log('✅ Model instance created successfully for testing');
        } catch (modelError) {
          console.error('❌ Model creation failed (API key issue):', modelError.message);
          console.log('🔧 This suggests the API key may be invalid or there are network issues');
          this.genAI = null;
        }
        
      } catch (error) {
        console.error('❌ AI service initialization failed:', error);
        console.error('❌ Error details:', error.message);
        console.log('🔧 Falling back to chart-only mode');
        this.genAI = null;
      }
    } else {
      console.log('❌ No API key provided, AI features will be disabled');
      this.genAI = null;
    }

    this.recordButton = document.getElementById(
      'recordButton',
    ) as HTMLButtonElement;
    
    console.log('🔍 Record button element search result:', this.recordButton);
    console.log('🔍 Record button exists:', !!this.recordButton);
    console.log('🔍 Record button tag name:', this.recordButton?.tagName);
    console.log('🔍 Record button ID:', this.recordButton?.id);
    console.log('🔍 Record button classes:', this.recordButton?.className);
    
    if (!this.recordButton) {
      console.error('❌ CRITICAL: Record button not found during initialization!');
      console.log('🔍 DOM ready state:', document.readyState);
      console.log('🔍 All elements with recordButton ID:', document.querySelectorAll('#recordButton'));
      console.log('🔍 All button elements:', document.querySelectorAll('button').length);
    }
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
      console.warn('⚠️ aiChartDisplayArea element not found. Charts will not be displayed in raw section.');
      // Create a dummy div to prevent errors if it's missing, though it won't be visible
      this.aiChartDisplayArea = document.createElement('div'); 
    } else {
      console.log('✅ aiChartDisplayArea found and initialized');
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

    this.autoSaveIndicator = document.getElementById('autoSaveIndicator') as HTMLDivElement;

    // Initialize new UX enhancement elements
    this.confidenceIndicator = document.getElementById('confidenceIndicator') as HTMLDivElement;
    this.confidenceLevel = document.getElementById('confidenceLevel') as HTMLDivElement;
    this.confidenceText = document.getElementById('confidenceText') as HTMLSpanElement;
    this.voiceActivityIndicator = document.getElementById('voiceActivityIndicator') as HTMLDivElement;
    this.voiceActivityBars = document.querySelectorAll('.voice-activity-bar') as NodeListOf<HTMLDivElement>;

    // Priority 2: Initialize analytics and export elements
    this.analyticsPanel = document.getElementById('analyticsPanel') as HTMLDivElement;
    this.exportModal = document.getElementById('exportModal') as HTMLDivElement;

    // Priority 3: Initialize smart suggestions and content insights elements
    this.smartSuggestionsPanel = document.getElementById('smartSuggestionsPanel') as HTMLDivElement;
    this.smartSuggestionsButton = document.getElementById('smartSuggestionsButton') as HTMLButtonElement;
    this.contentInsightsPanel = document.getElementById('contentInsightsPanel') as HTMLDivElement;
    this.semanticSearchInput = document.getElementById('semanticSearchInput') as HTMLInputElement;
    this.searchResults = document.getElementById('searchResults') as HTMLDivElement;

    // Priority 4: Initialize multi-modal integration and workflow elements
    this.fileDropZone = document.getElementById('fileDropZone') as HTMLDivElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.contentLibraryPanel = document.getElementById('contentLibraryPanel') as HTMLDivElement;
    this.contentLibraryButton = document.getElementById('contentLibraryButton') as HTMLButtonElement;
    this.workflowPanel = document.getElementById('workflowPanel') as HTMLDivElement;
    this.workflowButton = document.getElementById('workflowButton') as HTMLButtonElement;
    this.filesList = document.getElementById('filesList') as HTMLDivElement;
    this.workflowsList = document.getElementById('workflowsList') as HTMLDivElement;

    this.initializeErrorHandling();
    this.bindEventListeners();
    this.initTheme();
    
    // Initialize authentication system first
    this.initializeAuthenticationSystem();

    this.recordingStatus.textContent = 'Ready to record';
    this.setupSpeechRecognition();
    this.checkNetworkStatus();
    this.initializePerformanceOptimizations();
    this.initializeStorage();
    this.initializeAnalytics(); // Initialize analytics
    this.initializePriority3Features(); // Initialize Priority 3: Advanced AI Integration
    this.initializePriority4Features(); // Initialize Priority 4: Multi-modal Integration & Advanced Workflows
    
    // Priority 5 features will be initialized after authentication is complete
    // This is handled in initializeAuthenticationSystem() and initializeUserSession()
    
    // ⚠️ AUTO-TESTING DISABLED TO PREVENT INFINITE CHART GENERATION
    // The duplicate setTimeout calls below have been commented out to prevent
    // automatic testing functions from running that could trigger chart generation
    /*
    // Run initialization tests and performance monitoring after basic setup
    setTimeout(() => {
      this.testPriority3Features();
      this.testCrossFeatureIntegration();
      this.testPriority4Features(); // Test Priority 4 features
      
      // Set up periodic performance optimization
      setInterval(() => {
        this.optimizePriority3Performance();
        this.optimizePriority4Performance();
      }, 30000); // Optimize every 30 seconds
    }, 2000); // Wait 2 seconds for full initialization
    */

    // Initialize feature status dashboard
    this.createFeatureStatusDashboard();
    
    // ⚠️ FIXED: Set up SINGLE periodic performance optimization (preventing duplicate intervals)
    setTimeout(() => {
      // Only run performance optimization, not testing functions
      if (this.performanceOptimizationInterval) {
        clearInterval(this.performanceOptimizationInterval);
      }
      this.performanceOptimizationInterval = setInterval(() => {
        this.optimizePriority3Performance();
        this.optimizePriority4Performance();
      }, 30000); // Optimize every 30 seconds
    }, 2000); // Wait 2 seconds for full initialization
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

  // Enhanced Error Handling Methods
  private initializeErrorHandling(): void {
    console.log('Initializing error handling system...');
    
    try {
      // Initialize toast container for user notifications
      this.createToastContainer();
      
      // Set up network status monitoring
      this.initializeNetworkMonitoring();
      
      // Create permission overlay for microphone access requests
      this.createPermissionOverlay();
      
      // Initialize error retry mechanisms
      this.retryAttempts.clear();
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      console.log('Error handling system initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize error handling system:', error);
      // Fallback error handling if initialization fails
      this.setupBasicErrorHandling();
    }
  }

  private createToastContainer(): void {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toastContainer';
      this.toastContainer.className = 'toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }
  }

  private initializeNetworkMonitoring(): void {
    if (!this.networkStatus) {
      this.networkStatus = document.createElement('div');
      this.networkStatus.id = 'networkStatus';
      this.networkStatus.className = 'network-status hidden';
      this.networkStatus.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        z-index: 9999;
        background: var(--error-color, #dc3545);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      this.networkStatus.innerHTML = `
        <i class="fas fa-wifi" style="margin-right: 8px;"></i>
        <span>Connection lost</span>
      `;
      document.body.appendChild(this.networkStatus);
    }

    // Monitor network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.hideNetworkStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNetworkStatus();
    });
  }

  private createPermissionOverlay(): void {
    if (!this.permissionOverlay) {
      this.permissionOverlay = document.createElement('div');
      this.permissionOverlay.id = 'permissionOverlay';
      this.permissionOverlay.className = 'permission-overlay hidden';
      this.permissionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      `;
      
      this.permissionOverlay.innerHTML = `
        <div style="
          background: var(--surface-color, #1e1e1e);
          padding: 32px;
          border-radius: 16px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        ">
          <div style="
            width: 64px;
            height: 64px;
            background: var(--primary-color, #007bff);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          ">
            <i class="fas fa-microphone" style="font-size: 24px; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 16px; color: var(--text-primary, white);">Microphone Permission Required</h3>
          <p style="margin: 0 0 24px; color: var(--text-secondary, #ccc); line-height: 1.5;">
            Voice Notes needs access to your microphone to record and transcribe your voice. 
            Please allow microphone access in your browser settings.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="permissionRetryBtn" style="
              background: var(--primary-color, #007bff);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">
              <i class="fas fa-redo" style="margin-right: 8px;"></i>
              Try Again
            </button>
            <button id="permissionCloseBtn" style="
              background: transparent;
              color: var(--text-secondary, #ccc);
              border: 1px solid var(--border-color, #555);
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
            ">
              Cancel
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(this.permissionOverlay);
      
      // Add event listeners for permission overlay buttons
      const retryBtn = this.permissionOverlay.querySelector('#permissionRetryBtn');
      const closeBtn = this.permissionOverlay.querySelector('#permissionCloseBtn');

      retryBtn?.addEventListener('click', () => { // Added event listener
        this.hidePermissionOverlay();
        this.startRecording();
      });
      
      closeBtn?.addEventListener('click', () => {
        this.hidePermissionOverlay();
      });
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handler for unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError({
        operation: 'UNHANDLED_PROMISE',
        details: event.reason,
        userMessage: 'An unexpected error occurred. Please try again.',
        retryable: false
      });
    });

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global JavaScript error:', event.error);
      this.handleError({
        operation: 'JAVASCRIPT_ERROR',
        details: event.error,
        userMessage: 'An unexpected error occurred. Please refresh the page.',
        retryable: false
      });
    });
  }

  private setupBasicErrorHandling(): void {
    // Fallback error handling if full initialization fails
    console.warn('Using basic error handling fallback');
    
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
      document.body.appendChild(this.toastContainer);
    }
  }

  private showToast(options: ToastOptions): void {
    if (!this.toastContainer) {
      this.createToastContainer();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type}`;
    toast.style.cssText = `
      background: var(--surface-color, #2d3748);
      border: 1px solid var(--border-color, #4a5568);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      pointer-events: auto;
      position: relative;
    `;

    // Set border color based on type
    const colors = {
      success: 'var(--success-color, #28a745)',
      error: 'var(--error-color, #dc3545)',
      warning: 'var(--warning-color, #ffc107)',
      info: 'var(--info-color, #17a2b8)'
    };
    toast.style.borderLeftColor = colors[options.type];
    toast.style.borderLeftWidth = '4px';

    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <i class="fas ${iconMap[options.type]}" style="
          color: ${colors[options.type]};
          font-size: 18px;
          margin-top: 2px;
          flex-shrink: 0;
        "></i>
        <div style="flex: 1;">
          <div style="
            font-weight: 600;
            color: var(--text-primary, white);
            margin-bottom: 4px;
            font-size: 14px;
          ">${options.title}</div>
          <div style="
            color: var(--text-secondary, #ccc);
            font-size: 13px;
            line-height: 1.4;
          ">${options.message}</div>
          ${options.showRetry ? `
            <button id="toast-retry-${Date.now()}" style="
              background: ${colors[options.type]};
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              margin-top: 8px;
              cursor: pointer;
            ">
              <i class="fas fa-redo" style="margin-right: 4px;"></i>
              Retry
            </button>
          ` : ''}
        </div>
        <button style="
          background: none;
          border: none;
          color: var(--text-secondary, #ccc);
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
          flex-shrink: 0;
        " onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    // Add retry functionality if provided
    if (options.showRetry && options.onRetry) {
      const retryBtn = toast.querySelector(`[id^="toast-retry-"]`);
      retryBtn?.addEventListener('click', () => {
        options.onRetry?.();
        toast.remove();
      });
    }

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    // Auto-remove after duration
    const duration = options.duration || 5000;
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  private handleError(context: ErrorContext): void {
    console.error(`Error in ${context.operation}:`, context.details);

    // Track retry attempts
    const currentAttempts = this.retryAttempts.get(context.operation) || 0;
    
    if (context.retryable && currentAttempts < this.maxRetryAttempts) {
      this.retryAttempts.set(context.operation, currentAttempts + 1);
      
      this.showToast({
        type: 'error',
        title: 'Error Occurred',
        message: context.userMessage,
        duration: 6000,
        showRetry: true,
        onRetry: context.retryAction
      });
    } else {
      // Max retries reached or not retryable
      if (context.retryable) {
        this.retryAttempts.delete(context.operation); // Reset for future attempts
      }
      
      this.showToast({
        type: 'error',
        title: context.retryable ? 'Max Retries Reached' : 'Error',
        message: context.retryable ? 
          `${context.userMessage} Please try again later.` : 
          context.userMessage,
        duration: 8000
      });
    }

    // Update network status if it's a network-related error
    if (context.operation.includes('NETWORK') && !this.isOnline) {
      this.showNetworkStatus();
    }
  }

  private showPermissionOverlay(): void {
    if (this.permissionOverlay) {
      this.permissionOverlay.classList.remove('hidden');
      this.permissionOverlay.style.opacity = '1';
      this.permissionOverlay.style.visibility = 'visible';
    }
  }

  private hidePermissionOverlay(): void {
    if (this.permissionOverlay) {
      this.permissionOverlay.style.opacity = '0';
      this.permissionOverlay.style.visibility = 'hidden';
      setTimeout(() => {
        this.permissionOverlay?.classList.add('hidden');
      }, 300);
    }
  }

  private showNetworkStatus(): void {
    if (this.networkStatus) {
      this.networkStatus.classList.remove('hidden');
      this.networkStatus.style.opacity = '1';
    }
  }

  private hideNetworkStatus(): void {
    if (this.networkStatus) {
      this.networkStatus.style.opacity = '0';
      setTimeout(() => {
        this.networkStatus?.classList.add('hidden');
      }, 300);
    }
  }

  private bindEventListeners(): void {
    console.log('Binding event listeners...');
    
    try {
      // Core recording functionality
      if (this.recordButton) {
        console.log('✅ Record button found, adding event listener');
        this.recordButton.addEventListener('click', (event) => {
          console.log('🎤 Record button clicked!', event);
          console.log('🎤 Current recording state:', this.isRecording);
          if (this.isRecording) {
            console.log('🛑 Stopping recording...');
            this.stopRecording();
          } else {
            console.log('🎤 Starting recording...');
            this.startRecording();
          }
        });
        console.log('✅ Record button event listener added successfully');
      } else {
        console.error('❌ Record button not found! Cannot bind recording functionality.');
        console.log('🔍 Available elements with recordButton ID:', document.querySelectorAll('#recordButton').length);
        console.log('🔍 All button elements:', document.querySelectorAll('button').length);
      }

      // New note functionality
      if (this.newButton) {
        this.newButton.addEventListener('click', () => {
          this.clearCurrentNote();
        });
      }

      // Test chart button functionality
      const testChartButton = document.getElementById('testChartButton') as HTMLButtonElement;
      if (testChartButton) {
        testChartButton.addEventListener('click', () => {
          console.log('🧪 Test chart button clicked');
          
          // Always test direct Chart.js first
          this.testChartWithoutAI();
          
          // Then test with AI after a delay (only if AI service is available)
          if (this.genAI) {
            setTimeout(() => {
              console.log('🧪 Now testing with AI service...');
              this.testChartGeneration();
            }, 2000);
          } else {
            console.log('⚠️ Skipping AI chart test - AI service not available');
            this.showToast({
              type: 'info',
              title: 'Chart Test Complete',
              message: 'Direct chart test completed. AI service unavailable for AI chart test.'
            });
          }
        });
      }

      // Theme toggle functionality
      if (this.themeToggleButton) {
        this.themeToggleButton.addEventListener('click', () => {
          this.toggleTheme();
        });
      }

      // Analytics panel toggle
      const analyticsButton = document.getElementById('analyticsButton') as HTMLButtonElement;
      if (analyticsButton) {
        analyticsButton.addEventListener('click', () => {
          this.toggleAnalyticsPanel();
        });
      }

      // Advanced export functionality
      const advancedExportButton = document.getElementById('advancedExportButton') as HTMLButtonElement;
      if (advancedExportButton) {
        advancedExportButton.addEventListener('click', () => {
          this.showAdvancedExportModal();
        });
      }

      // Smart suggestions functionality
      if (this.smartSuggestionsButton) {
        this.smartSuggestionsButton.addEventListener('click', () => {
          this.toggleSmartSuggestionsPanel();
        });
      }

      // Content library functionality
      if (this.contentLibraryButton) {
        this.contentLibraryButton.addEventListener('click', () => {
          this.toggleContentLibraryPanel();
        });
      }

      // Workflow automation functionality
      if (this.workflowButton) {
        this.workflowButton.addEventListener('click', () => {
          this.toggleWorkflowPanel();
        });
      }

      // File upload functionality
      if (this.fileInput) {
        this.fileInput.addEventListener('change', (event) => {
          this.handleFileUpload(event);
        });
      }

      // File drop zone functionality
      if (this.fileDropZone) {
        this.setupFileDropZone();
      }

      // Semantic search functionality
      if (this.semanticSearchInput) {
        this.semanticSearchInput.addEventListener('input', (event) => {
          this.handleSemanticSearch((event.target as HTMLInputElement).value);
        });
      }

      // Panel close buttons
      this.bindPanelCloseButtons();

      // Modal functionality
      this.bindModalEventListeners();

      // Export functionality
      this.bindExportEventListeners();

      // Sample charts button functionality
      const sampleChartsButton = document.getElementById('sampleChartsButton') as HTMLButtonElement;
      if (sampleChartsButton) {
        sampleChartsButton.addEventListener('click', () => {
          console.log('📊 Sample charts button clicked');
          this.generateSampleCharts();
        });
      }

      console.log('Event listeners bound successfully');
      
      // Add keyboard shortcut for testing chart generation (Ctrl+Shift+T)
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
          console.log('🧪 Chart generation test triggered via keyboard shortcut');
          this.testChartGeneration();
        }
      });
      
    } catch (error) {
      console.error('Error binding event listeners:', error);
      this.handleError({
        operation: 'BIND_EVENT_LISTENERS',
        details: error,
        userMessage: 'Failed to set up interface controls. Some features may not work.',
        retryable: true,
        retryAction: () => this.bindEventListeners()
      });
    }
  }

  private bindPanelCloseButtons(): void {
    // Analytics panel close
    const analyticsCloseBtn = document.querySelector('.analytics-panel .btn-close') as HTMLButtonElement;
    if (analyticsCloseBtn) {
      analyticsCloseBtn.addEventListener('click', () => {
        this.closeAnalyticsPanel();
      });
    }

    // Smart suggestions panel close
    const suggestionsCloseBtn = document.querySelector('.smart-suggestions-panel .suggestions-close') as HTMLButtonElement;
    if (suggestionsCloseBtn) {
      suggestionsCloseBtn.addEventListener('click', () => {
        this.closeSmartSuggestionsPanel();
      });
    }

    // Content library panel close
    const libraryCloseBtn = document.getElementById('closeLibrary') as HTMLButtonElement;
    if (libraryCloseBtn) {
      libraryCloseBtn.addEventListener('click', () => {
        this.closeContentLibraryPanel();
      });
    }

    // Workflow panel close
    const workflowCloseBtn = document.getElementById('closeWorkflow') as HTMLButtonElement;
    if (workflowCloseBtn) {
      workflowCloseBtn.addEventListener('click', () => {
        this.closeWorkflowPanel();
      });
    }
  }

  private bindModalEventListeners(): void {
    // Export modal
    const exportModal = document.getElementById('exportModal');
    const cancelExportBtn = document.getElementById('cancelExport') as HTMLButtonElement;
    const confirmExportBtn = document.getElementById('confirmExport') as HTMLButtonElement;

    if (cancelExportBtn) {
      cancelExportBtn.addEventListener('click', () => {
        this.closeExportModal();
      });
    }

    if (confirmExportBtn) {
      confirmExportBtn.addEventListener('click', () => {
        this.executeAdvancedExport();
      });
    }

    // Close modal when clicking overlay
    if (exportModal) {
      exportModal.addEventListener('click', (event) => {
        if (event.target === exportModal) {
          this.closeExportModal();
        }
      });
    }
  }

  private bindExportEventListeners(): void {
    // Add any additional export-related event listeners here
    console.log('Export event listeners bound');
  }

  private setupFileDropZone(): void {
    if (!this.fileDropZone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.fileDropZone!.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      this.fileDropZone!.addEventListener(eventName, () => {
        this.fileDropZone!.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.fileDropZone!.addEventListener(eventName, () => {
        this.fileDropZone!.classList.remove('drag-over');
      });
    });

    // Handle dropped files
    this.fileDropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files) {
        this.handleDroppedFiles(files);
      }
    });

    // Handle click to open file dialog
    this.fileDropZone.addEventListener('click', () => {
      this.fileInput?.click();
    });
  }

  // Basic method implementations for event handlers
  private clearCurrentNote(): void {
    this.finalTranscript = '';
    this.rawTranscription.textContent = '';
    this.polishedNote.innerHTML = '';
    this.currentNote = null;
    this.editorTitle.textContent = 'New Note';
    
    // Clear charts
    this.clearActiveCharts();
    
    // Reset analytics
    this.resetCurrentSession();
    
    this.showToast({
      type: 'info',
      title: 'Note Cleared',
      message: 'Started a new note'
    });
  }

  private toggleAnalyticsPanel(): void {
    if (this.analyticsPanel) {
      this.analyticsPanel.classList.toggle('open');
    }
  }

  private closeAnalyticsPanel(): void {
    if (this.analyticsPanel) {
      this.analyticsPanel.classList.remove('open');
    }
  }

  private showAdvancedExportModal(): void {
    if (this.exportModal) {
      this.exportModal.classList.add('open');
      this.exportModal.style.display = 'flex';
    }
  }

  private closeExportModal(): void {
    if (this.exportModal) {
      this.exportModal.classList.remove('open');
      this.exportModal.style.display = 'none';
    }
  }

  private executeAdvancedExport(): void {
    try {
      // Get selected format
      const formatRadio = document.querySelector('input[name="exportFormat"]:checked') as HTMLInputElement;
      const format = formatRadio?.value || 'markdown';
      
      // Get selected options
      const includePolished = (document.querySelector('input[name="includePolished"]') as HTMLInputElement)?.checked ?? true;
      const includeRaw = (document.querySelector('input[name="includeRaw"]') as HTMLInputElement)?.checked ?? false;
      const includeCharts = (document.querySelector('input[name="includeCharts"]') as HTMLInputElement)?.checked ?? true;
      
      this.exportNote({ format, includeRaw, includeCharts } as ExportOptions);
      this.closeExportModal();
      
      this.showToast({
        type: 'success',
        title: 'Export Complete',
        message: `Note exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Export error:', error);
      this.showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not export the note. Please try again.'
      });
    }
  }

  private toggleSmartSuggestionsPanel(): void {
    if (this.smartSuggestionsPanel) {
      this.smartSuggestionsPanel.classList.toggle('open');
    }
  }

  private closeSmartSuggestionsPanel(): void {
    if (this.smartSuggestionsPanel) {
      this.smartSuggestionsPanel.classList.remove('open');
    }
  }

  private toggleContentLibraryPanel(): void {
    if (this.contentLibraryPanel) {
      this.contentLibraryPanel.classList.toggle('open');
    }
  }

  private closeContentLibraryPanel(): void {
    if (this.contentLibraryPanel) {
      this.contentLibraryPanel.classList.remove('open');
    }
  }

  private toggleWorkflowPanel(): void {
    if (this.workflowPanel) {
      this.workflowPanel.classList.toggle('open');
    }
  }

  private closeWorkflowPanel(): void {
    if (this.workflowPanel) {
      this.workflowPanel.classList.remove('open');
    }
  }

  private handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      this.processUploadedFiles(files);
    }
  }

  private handleDroppedFiles(files: FileList): void {
    this.processUploadedFiles(files);
  }

  private processUploadedFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      console.log('Processing file:', file.name);
      this.showToast({
        type: 'info',
        title: 'File Upload',
        message: `Processing ${file.name}...`
      });
      // File processing logic would go here
    });
  }

  private handleSemanticSearch(query: string): void {
    if (!query.trim()) {
      if (this.searchResults) {
        this.searchResults.innerHTML = '';
      }
      return;
    }

    // Basic search implementation
    console.log('Searching for:', query);
    if (this.searchResults) {
      this.searchResults.innerHTML = `<div class="search-result-item">Searching for "${query}"...</div>`;
    }
  }

  private clearActiveCharts(): void {
    this.activeAiChartInstances.forEach(chart => {
      chart.destroy();
    });
    this.activeAiChartInstances = [];
    
    if (this.aiChartDisplayArea) {
      this.aiChartDisplayArea.innerHTML = '';
    }
  }

  private resetCurrentSession(): void {
    this.currentSession = null;
    this.speechMetrics = {
      wordsPerMinute: 0,
      totalWords: 0,
      totalPauses: 0,
      confidenceSum: 0,
      confidenceCount: 0
    };
  }

  private exportNote(options: ExportOptions): void {
    const content = options.includeRaw ? this.finalTranscript : this.polishedNote.textContent || '';
    const filename = `voice-note-${Date.now()}.${options.format === 'plain' ? 'txt' : options.format}`;
    
    let exportContent = '';
    
    switch (options.format) {
      case 'markdown':
        exportContent = `# Voice Note\n\n${content}`;
        break;
      case 'html':
        exportContent = `<!DOCTYPE html><html><head><title>Voice Note</title></head><body><h1>Voice Note</h1><p>${content}</p></body></html>`;
        break;
      default:
        exportContent = content;
    }
    
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Initialize theme system
  private initTheme(): void {
    console.log('Initializing theme system...');
    
    try {
      // Check saved theme preference
      const savedTheme = localStorage.getItem('voice-notes-theme') || 'dark';
      
      // Apply the saved theme
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
      
      // Update theme toggle icon
      if (this.themeToggleButton) {
        const icon = this.themeToggleButton.querySelector('i');
        if (icon) {
          icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
      }
      
      console.log(`Theme initialized: ${savedTheme}`);
      
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // Fallback to dark theme
      document.body.className = '';
      this.handleError({
        operation: 'initTheme',
        details: error,
        userMessage: 'Failed to initialize theme system',
        retryable: false
      });
    }
  }

  // Toggle between light and dark themes
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
      if (this.themeToggleButton) {
        const icon = this.themeToggleButton.querySelector('i');
        if (icon) {
          icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
      }
      
      this.showToast({
        type: 'success',
        title: 'Theme Changed',
        message: `Switched to ${newTheme} mode`,
        duration: 2000
      });
      
      console.log(`Theme toggled to: ${newTheme}`);
      
    } catch (error) {
      console.error('Failed to toggle theme:', error);
      this.handleError({
        operation: 'toggleTheme',
        details: error,
        userMessage: 'Failed to change theme',
        retryable: true,
        retryAction: () => this.toggleTheme()
      });
    }
  }

  // Setup speech recognition API
  private setupSpeechRecognition(): void {
    console.log('Setting up speech recognition...');
    
    try {
      // Check for speech recognition support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        this.showToast({
          type: 'warning',
          title: 'Feature Limited',
          message: 'Speech recognition not supported in this browser. Recording will still work but transcription will be limited.',
          duration: 7000
        });
        return;
      }
      
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';
      this.speechRecognition.maxAlternatives = 1;
      
      console.log('Speech recognition configuration:', {
        continuous: this.speechRecognition.continuous,
        interimResults: this.speechRecognition.interimResults,
        lang: this.speechRecognition.lang
      });
      
      // Set up event handlers
      this.speechRecognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.recordingStatus.textContent = 'Listening...';
      };
      
      this.speechRecognition.onresult = (event: any) => {
        console.log('📝 Speech recognition result received:', event);
        
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const resultConfidence = result[0].confidence || 0.9; // Default confidence if not provided
          
          console.log(`Result ${i}:`, {
            transcript,
            confidence: resultConfidence,
            isFinal: result.isFinal
          });
          
          if (result.isFinal) {
            finalTranscript += transcript;
            console.log('✅ Final transcript chunk:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Interim transcript chunk:', transcript);
          }
          
          confidence = Math.max(confidence, resultConfidence);
        }
        
        // Update confidence indicator
        this.updateConfidenceIndicator(confidence * 100);
        
        // Update transcription display
        this.updateTranscriptionDisplay(interimTranscript, finalTranscript);
        
        if (finalTranscript.trim()) {
          this.finalTranscript += finalTranscript + ' ';
          this.processNewTranscription(finalTranscript);
          console.log('📋 Updated final transcript:', this.finalTranscript);
        }
      };
      
      this.speechRecognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error, event);
        
        if (event.error === 'not-allowed') {
          this.showPermissionOverlay();
          this.recordingStatus.textContent = 'Microphone access denied';
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
          this.recordingStatus.textContent = 'No speech detected - keep talking...';
        } else if (event.error === 'network') {
          this.recordingStatus.textContent = 'Network error - transcription may be limited';
          this.showToast({
            type: 'warning',
            title: 'Network Issue',
            message: 'Transcription quality may be affected by network connectivity',
            duration: 5000
          });
        } else {
          this.recordingStatus.textContent = 'Speech recognition error';
          this.handleError({
            operation: 'speechRecognition',
            details: event.error,
            userMessage: 'Speech recognition error occurred',
            retryable: true,
            retryAction: () => this.restartSpeechRecognition()
          });
        }
      };
      
      this.speechRecognition.onend = () => {
        console.log('🔚 Speech recognition ended');
        if (this.isRecording) {
          console.log('🔄 Restarting speech recognition...');
          // Small delay before restarting to prevent rapid restart loops
          setTimeout(() => {
            if (this.isRecording && this.speechRecognition) {
              try {
                this.speechRecognition.start();
              } catch (error) {
                console.error('Failed to restart speech recognition:', error);
              }
            }
          }, 100);
        }
      };
      
      console.log('✅ Speech recognition setup complete');
      
    } catch (error) {
      console.error('Failed to setup speech recognition:', error);
      this.handleError({
        operation: 'setupSpeechRecognition',
        details: error,
        userMessage: 'Failed to setup speech recognition',
        retryable: true,
        retryAction: () => this.setupSpeechRecognition()
      });
    }
  }

  private restartSpeechRecognition(): void {
    if (this.speechRecognition && this.isRecording) {
      try {
        this.speechRecognition.stop();
        setTimeout(() => {
          if (this.speechRecognition && this.isRecording) {
            this.speechRecognition.start();
          }
        }, 500);
      } catch (error) {
        console.error('Failed to restart speech recognition:', error);
      }
    }
  }

  // Start recording functionality
  private startRecording(): void {
    console.log('Starting recording...');
    
    try {
      if (this.isRecording) {
        console.log('Already recording');
        return;
      }
      
      // Request microphone permission and start recording
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          this.stream = stream;
          this.isRecording = true;
          
          // Update UI
          this.recordButton.classList.add('recording');
          this.recordingStatus.textContent = 'Recording...';
          this.recordingInterface.classList.add('is-live');
          
          // Update record button icon
          const icon = this.recordButton.querySelector('i');
          if (icon) {
            icon.className = 'fas fa-stop';
          }
          
          // Show confidence and voice activity indicators
          if (this.confidenceIndicator) {
            this.confidenceIndicator.style.display = 'flex';
          }
          if (this.voiceActivityIndicator) {
            this.voiceActivityIndicator.style.display = 'flex';
          }
          
          // Setup audio context for visualizations
          this.setupAudioContext(stream);
          
          // Start speech recognition
          if (this.speechRecognition) {
            console.log('🎤 Starting speech recognition...');
            try {
              this.speechRecognition.start();
              console.log('✅ Speech recognition started successfully');
            } catch (error) {
              console.error('❌ Failed to start speech recognition:', error);
              this.showToast({
                type: 'warning',
                title: 'Transcription Limited',
                message: 'Speech recognition could not start, but audio recording is active',
                duration: 5000
              });
            }
          } else {
            console.warn('⚠️ Speech recognition not available');
            this.showToast({
              type: 'info',
              title: 'Recording Only',
              message: 'Audio recording active. Transcription not available in this browser.',
              duration: 5000
            });
          }
          
          // Setup media recorder for audio file
          this.setupMediaRecorder(stream);
          
          // Start recording timer
          this.startRecordingTimer();
          
          // Start analytics session
          this.startAnalyticsSession();
          
          console.log('Recording started successfully');
          
          this.showToast({
            type: 'success',
            title: 'Recording Started',
            message: 'Voice recording in progress',
            duration: 3000
          });
          
        })
        .catch((error) => {
          console.error('Failed to access microphone:', error);
          
          if (error.name === 'NotAllowedError') {
            this.showPermissionOverlay();
          } else {
            this.handleError({
              operation: 'startRecording',
              details: error,
              userMessage: 'Failed to access microphone',
              retryable: true,
              retryAction: () => this.startRecording()
            });
          }
        });
        
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.handleError({
        operation: 'startRecording',
        details: error,
        userMessage: 'Failed to start recording',
        retryable: true,
        retryAction: () => this.startRecording()
      });
    }
  }

  // Stop recording functionality
  private stopRecording(): void {
    console.log('Stopping recording...');
    
    try {
      if (!this.isRecording) {
        console.log('Not currently recording');
        return;
      }
      
      this.isRecording = false;
      
      // Stop speech recognition
      if (this.speechRecognition) {
        this.speechRecognition.stop();
      }
      
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      
      // Stop audio stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Update UI
      this.recordButton.classList.remove('recording');
      this.recordingStatus.textContent = 'Processing...';
      this.recordingInterface.classList.remove('is-live');
      
      // Update record button icon
      const icon = this.recordButton.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-microphone';
      }
      
      // Hide indicators
      if (this.confidenceIndicator) {
        this.confidenceIndicator.style.display = 'none';
      }
      if (this.voiceActivityIndicator) {
        this.voiceActivityIndicator.style.display = 'none';
      }
      
      // Stop recording timer
      this.stopRecordingTimer();
      
      // Stop audio visualization
      this.stopAudioVisualization();
      
      // Process final transcription
      this.processFinalTranscription();
      
      // End analytics session
      this.endAnalyticsSession();
      
      console.log('Recording stopped successfully');
      
      this.showToast({
        type: 'success',
        title: 'Recording Stopped',
        message: 'Processing transcription...',
        duration: 3000
      });
      
      // Update status after processing
      setTimeout(() => {
        this.recordingStatus.textContent = 'Ready to record';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.handleError({
        operation: 'stopRecording',
        details: error,
        userMessage: 'Failed to stop recording properly',
        retryable: false
      });
    }
  }

  // Helper methods for recording functionality
  private setupAudioContext(stream: MediaStream): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      
      source.connect(this.analyserNode);
      
      const bufferLength = this.analyserNode.frequencyBinCount;
      this.waveformDataArray = new Uint8Array(bufferLength);
      
      // Start visualization
      this.startAudioVisualization();
      
    } catch (error) {
      console.error('Failed to setup audio context:', error);
    }
  }

  private setupMediaRecorder(stream: MediaStream): void {
    try {
      this.mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Could save or process the audio file here if needed
        console.log('Audio recording saved:', audioBlob);
      };
      
      this.mediaRecorder.start();
      
    } catch (error) {
      console.error('Failed to setup media recorder:', error);
    }
  }

  private startRecordingTimer(): void {
    this.recordingStartTime = Date.now();
    
    this.timerIntervalId = window.setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const centiseconds = Math.floor((elapsed % 1000) / 10);
      
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
      
      if (this.liveRecordingTimerDisplay) {
        this.liveRecordingTimerDisplay.textContent = timeString;
        this.liveRecordingTimerDisplay.style.display = 'block';
      }
    }, 10);
  }

  private stopRecordingTimer(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    
    if (this.liveRecordingTimerDisplay) {
      this.liveRecordingTimerDisplay.style.display = 'none';
    }
  }

  private startAudioVisualization(): void {
    if (!this.analyserNode || !this.waveformDataArray) return;
    
    const draw = () => {
      if (!this.isRecording) return;
      
      this.analyserNode!.getByteFrequencyData(this.waveformDataArray!);
      
      // Update voice activity indicator
      this.updateVoiceActivity();
      
      // Schedule next frame
      this.waveformDrawingId = requestAnimationFrame(draw);
    };
    
    draw();
  }

  private stopAudioVisualization(): void {
    if (this.waveformDrawingId) {
      cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
    }
  }

  private updateVoiceActivity(): void {
    if (!this.waveformDataArray || !this.voiceActivityBars) return;
    
    // Calculate average volume
    const sum = this.waveformDataArray.reduce((a, b) => a + b, 0);
    const average = sum / this.waveformDataArray.length;
    
    // Update voice activity bars
    this.voiceActivityBars.forEach((bar, index) => {
      const threshold = (index + 1) * 30; // Different thresholds for each bar
      if (average > threshold) {
        bar.style.backgroundColor = 'var(--color-accent)';
        bar.style.height = `${Math.min(100, (average / 255) * 100)}%`;
      } else {
        bar.style.backgroundColor = 'var(--color-border)';
        bar.style.height = '20%';
      }
    });
  }

  private updateConfidenceIndicator(confidence: number): void {
    if (!this.confidenceLevel || !this.confidenceText) return;
    
    this.currentConfidence = confidence;
    
    // Update confidence bar
    this.confidenceLevel.style.width = `${confidence}%`;
    
    // Update confidence text
    this.confidenceText.textContent = `${Math.round(confidence)}%`;
    
    // Update color based on confidence level
    if (confidence >= 80) {
      this.confidenceLevel.style.backgroundColor = 'var(--color-success)';
    } else if (confidence >= 60) {
      this.confidenceLevel.style.backgroundColor = 'var(--color-accent)';
    } else {
      this.confidenceLevel.style.backgroundColor = 'var(--color-recording)';
    }
  }

  private updateTranscriptionDisplay(interimText: string, finalText?: string): void {
    if (this.rawTranscription) {
      let displayContent = this.finalTranscript;
      
      // Add any new final text that was just processed
      if (finalText) {
        displayContent += finalText;
      }
      
      // Add interim text in a different style
      if (interimText) {
        displayContent += '<span class="interim-text" style="color: var(--color-text-secondary); opacity: 0.7;">' + interimText + '</span>';
      }
      
      this.rawTranscription.innerHTML = displayContent || '<span style="color: var(--color-text-tertiary);">Start speaking to see transcription...</span>';
      
           
      // Scroll to bottom to show latest content
      this.rawTranscription.scrollTop = this.rawTranscription.scrollHeight;
    }
    
    console.log('📱 Display updated - Final:', this.finalTranscript.length, 'chars, Interim:', interimText?.length || 0, 'chars');
  }

  private processNewTranscription(text: string): void {
    // Update speech metrics
    this.updateSpeechMetrics(text);
    
    // Apply keyword highlighting
    this.applyKeywordHighlighting();
    
    // Update polished note if AI is available
    if (this.genAI) {
      console.log('🧠 Calling updatePolishedNote() from processNewTranscription');
      this.updatePolishedNote();
    } else {
      console.log('⚠️ AI not available for polishing during transcription');
    }
  }

  private processFinalTranscription(): void {
    // Final processing of the complete transcription
    if (this.finalTranscript.trim()) {
      console.log('🎯 Processing final transcription:', this.finalTranscript.length, 'characters');
      
      // Save to storage
      this.saveCurrentNote();
      
      // Process with AI if available
      if (this.genAI) {
        console.log('🧠 Calling generateAIInsights() from processFinalTranscription');
        this.generateAIInsights();
      } else {
        console.log('⚠️ AI not available for insights generation');
      }
    } else {
      console.log('⚠️ No final transcript to process');
    }
  }

  private updateSpeechMetrics(newText: string): void {
    if (!this.currentSession) {
      this.startAnalyticsSession();
    }
    
    const words = newText.split(' ').filter(word => word.length > 0);
    this.speechMetrics.totalWords += words.length;
    
    // Calculate words per minute
    const elapsedMinutes = (Date.now() - this.recordingStartTime) / 60000;
    if (elapsedMinutes > 0) {
      this.speechMetrics.wordsPerMinute = Math.round(this.speechMetrics.totalWords / elapsedMinutes);
    }
  }

  private applyKeywordHighlighting(): void {
    if (!this.rawTranscription) return;
    
    let content = this.finalTranscript;
    
    this.keywordHighlights.forEach(config => {
      config.words.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        content = content.replace(regex, `<span class="keyword-highlight ${config.className}" style="color: ${config.color}">${word}</span>`);
      });
    });
    
    this.rawTranscription.innerHTML = content;
  }

  private startAnalyticsSession(): void {
    this.currentSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      endTime: null,
      duration: 0,
      wordsTranscribed: 0,
      averageConfidence: 0,
      topicTags: [],
      sentiment: 'neutral'
    };
  }

  private endAnalyticsSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
      this.currentSession.wordsTranscribed = this.speechMetrics.totalWords;
      this.currentSession.averageConfidence = this.speechMetrics.confidenceCount > 0 
        ? this.speechMetrics.confidenceSum / this.speechMetrics.confidenceCount 
        : 0;
      
      this.sessionHistory.push(this.currentSession);
      this.updateAnalyticsDisplay();
    }
  }

  private updateAnalyticsDisplay(): void {
    // Update analytics panel with current session data
    const speakingRateEl = document.getElementById('speakingRate');
    const avgConfidenceEl = document.getElementById('avgConfidence');
    const recordingDurationEl = document.getElementById('recordingDuration');
    const wordsTranscribedEl = document.getElementById('wordsTranscribed');
    
    if (speakingRateEl) {
      speakingRateEl.textContent = `${this.speechMetrics.wordsPerMinute} WPM`;
    }
    
    if (avgConfidenceEl) {
      const avgConf = this.speechMetrics.confidenceCount > 0 
        ? Math.round(this.speechMetrics.confidenceSum / this.speechMetrics.confidenceCount)
        : 0;
      avgConfidenceEl.textContent = `${avgConf}%`;
    }
    
    if (recordingDurationEl && this.currentSession) {
      const duration = this.currentSession.endTime 
        ? this.currentSession.duration 
        : Date.now() - this.currentSession.startTime.getTime();
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      recordingDurationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (wordsTranscribedEl) {
      wordsTranscribedEl.textContent = this.speechMetrics.totalWords.toString();
    }
  }

  private saveCurrentNote(): void {
    if (!this.finalTranscript.trim()) return;
    
    const note: StoredNote = {
      id: Date.now().toString(),
      title: this.editorTitle.textContent || 'New Note',
      content: this.finalTranscript,
      timestamp: new Date(),
      wordCount: this.finalTranscript.split(' ').length
    };
    
    this.noteHistory.unshift(note);
    
    // Keep only the most recent notes
    if (this.noteHistory.length > this.maxStoredNotes) {
      this.noteHistory = this.noteHistory.slice(0, this.maxStoredNotes);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('voice-notes-history', JSON.stringify(this.noteHistory));
    } catch (error) {
      console.error('Failed to save note to storage:', error);
    }
  }

  private async updatePolishedNote(): Promise<void> {
    if (!this.polishedNote || !this.finalTranscript) return;
    
    console.log('🧠 updatePolishedNote() called with', this.finalTranscript.length, 'characters');
    
    if (this.genAI) {
      try {
        this.showToast({
          type: 'info',
          title: 'AI Processing',
          message: 'Polishing your notes with AI...'
        });
        
        console.log('📞 Calling Gemini for polishing...');
        const polishedResult = await this.callGeminiForPolishing(this.finalTranscript);
        console.log('📞 Gemini polishing response:', polishedResult);
        
        if (polishedResult) {
          console.log('✅ Got polished result, updating note content...');
          this.polishedNote.innerHTML = marked.parse(polishedResult.polishedNoteText);
          
          // DEBUG: Log the complete polished result structure
          console.log('🔍 Complete polished result object:', JSON.stringify(polishedResult, null, 2));
          
          // Generate charts if suggested by AI
          if (polishedResult.chartSuggestion) {
            console.log('📊 Chart suggestion received:', JSON.stringify(polishedResult.chartSuggestion, null, 2));
            console.log('🔍 AI Chart Display Area element:', this.aiChartDisplayArea);
            console.log('🔍 AI Chart Display Area innerHTML before:', this.aiChartDisplayArea?.innerHTML);
            
            await this.generateChartsFromAI(polishedResult.chartSuggestion);
            
            console.log('🔍 AI Chart Display Area innerHTML after:', this.aiChartDisplayArea?.innerHTML);
          } else {
            console.log('📊 No chart suggestion in AI response');
            console.log('🔍 polishedResult.chartSuggestion value:', polishedResult.chartSuggestion);
          }
          
          this.showToast({
            type: 'success',
            title: 'AI Processing Complete',
            message: 'Your notes have been polished and charts generated!'
          });
        } else {
          console.log('⚠️ No result from Gemini polishing call');
        }
      } catch (error) {
        console.error('AI polishing failed:', error);
        this.fallbackToBasicPolishing();
        this.showToast({
          type: 'warning',
          title: 'AI Unavailable',
          message: 'Using basic text formatting instead'
        });
      }
    } else {
      console.log('⚠️ genAI not available, using fallback polishing');
      this.fallbackToBasicPolishing();
    }
  }

  // Debug method to test chart generation manually
  public async testChartGeneration(): Promise<void> {
    console.log('🧪 Testing chart generation manually...');
    
    // Add visual indicator to the page
    this.showToast({
      type: 'info',
      title: 'Chart Test Started',
      message: 'Testing chart generation functionality...'
    });
    
    const testChartSuggestion = {
      type: 'bar',
      title: 'Test Sales Data (Manual)',
      description: 'Sample chart showing quarterly sales performance - Manual Test',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Sales ($k)',
          data: [120, 190, 300, 500],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0']
        }]
      }
    };
    
    console.log('🧪 Test chart suggestion (Manual):', testChartSuggestion);
    
    try {
      await this.generateChartsFromAI(testChartSuggestion);
      
      this.showToast({
        type: 'success',
        title: 'Chart Test Complete (Manual)',
        message: 'Manual chart generation test finished. Check the Raw tab for charts!'
      });
    } catch (error) {
      console.error('🧪 Chart test failed (Manual):', error);
      this.showToast({
        type: 'error',
        title: 'Chart Test Failed (Manual)',
        message: `Manual chart generation failed: ${error.message}`
      });
    }
  }

  // Simple test for Chart.js without AI service
  public async testChartWithoutAI(): Promise<void> {
    console.log('🧪 Testing Chart.js directly without AI...');
    
    if (!this.aiChartDisplayArea) {
      console.error('❌ Chart display area not found!');
      return;
    }
    
    // Clear existing content
    this.aiChartDisplayArea.innerHTML = '';
    
    const chartId = `direct-chart-${this.chartIdCounter++}`;
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>Direct Chart Test</h4>
        <p class="chart-description">Testing Chart.js directly without AI service</p>
      </div>
      <canvas id="${chartId}" width="400" height="200"></canvas>
    `;
    
    this.aiChartDisplayArea.appendChild(chartContainer);
    
    // Use querySelector on the container to find the canvas directly
    const canvas = chartContainer.querySelector(`#${chartId}`) as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Canvas element not found!');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas context not available!');
      return;
    }
    
    try {
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [{
            label: 'Sample Data',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 205, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      this.activeAiChartInstances.push(chart);
      console.log('✅ Direct Chart.js test successful!');
      
      this.showToast({
        type: 'success',
        title: 'Chart Test Success',
        message: 'Chart.js is working properly! Check the Raw tab.'
      });
      
    } catch (error) {
      console.error('❌ Direct Chart.js test failed:', error);
      this.showToast({
        type: 'error',
        title: 'Chart Test Failed',
        message: `Chart.js test failed: ${error.message}`
      });
    }
  }

  // Manual chart generation for testing charts with sample data
  public async generateSampleCharts(): Promise<void> {
    console.log('📊 Generating sample charts with predefined data...');
    
    if (!this.aiChartDisplayArea) {
      console.error('❌ Chart display area not found!');
      this.showToast({
        type: 'error',
        title: 'Chart Error',
        message: 'Chart display area not found. Switch to Raw tab.'
      });
      return;
    }
    
    // Clear existing charts
    this.clearActiveCharts();
    
    // Sample data for different chart types
    const sampleCharts = [
      {
        type: 'bar',
        title: 'Quarterly Sales Performance',
        description: 'Sample sales data showing quarterly performance',
        data: {
          labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
          datasets: [{
            label: 'Sales ($K)',
            data: [120, 190, 300, 500],
            backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'],
            borderColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'],
            borderWidth: 1
          }]
        }
      },
      {
        type: 'pie',
        title: 'Market Share Distribution',
        description: 'Sample market share breakdown by category',
        data: {
          labels: ['Product A', 'Product B', 'Product C', 'Product D'],
          datasets: [{
            label: 'Market Share (%)',
            data: [35, 25, 20, 20],
            backgroundColor: ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99'],
            borderWidth: 2
          }]
        }
      },
      {
        type: 'line',
        title: 'Growth Trend Analysis',
        description: 'Sample growth trend over time',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Growth Rate (%)',
            data: [5, 8, 12, 15, 18, 22],
            borderColor: '#36a2eb',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: true,
            tension: 0.4
          }]
        }
      }
    ];
    
    // Generate each sample chart
    for (const chartData of sampleCharts) {
      try {
        await this.generateChartsFromAI(chartData);
        console.log(`✅ Generated ${chartData.type} chart: ${chartData.title}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${chartData.type} chart:`, error);
      }
    }
    
    this.showToast({
      type: 'success',
      title: 'Sample Charts Generated',
      message: `Generated ${sampleCharts.length} sample charts successfully!`
    });
  }

  private fallbackToBasicPolishing(): void {
    if (!this.polishedNote || !this.finalTranscript) return;
    
    // Simple text formatting as fallback
    let polished = this.finalTranscript
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .replace(/\. +/g, '. ') // Ensure proper spacing after periods
      .trim();
    
    // Capitalize first letter of sentences
    polished = polished.replace(/(^|\. )(\w)/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    this.polishedNote.textContent = polished;
  }

  private async generateAIInsights(): Promise<void> {
    if (!this.genAI || !this.finalTranscript) {
      console.log('🧠 generateAIInsights() - AI service not available or no transcript');
      console.log('genAI:', !!this.genAI, 'finalTranscript length:', this.finalTranscript?.length || 0);
      return;
    }
    
    console.log('🧠 generateAIInsights() called with', this.finalTranscript.length, 'characters');
    
    try {
      this.showToast({
        type: 'info',
        title: 'Generating Insights',
        message: 'AI is analyzing your content...'
      });
      
      console.log('📞 Calling Gemini for insights...');
      const insights = await this.callGeminiForInsights(this.finalTranscript);
      console.log('📞 Gemini insights response:', insights);
      
      if (insights) {
        // Update content analysis in analytics panel
        console.log('📊 Updating content analysis display...');
        this.updateContentAnalysisDisplay(insights);
        
        // Generate charts based on insights
        console.log('📊 Generating charts from insights...');
        await this.generateChartsFromInsights(insights);
        
        this.showToast({
          type: 'success',
          title: 'Insights Generated',
          message: 'AI analysis complete with charts!'
        });
      } else {
        console.log('⚠️ No insights returned from Gemini call');
      }
    } catch (error) {
      console.error('AI insights generation failed:', error);
      this.showToast({
        type: 'error',
        title: 'AI Analysis Failed',
        message: 'Could not generate insights at this time'
      });
    }
  }

  private async callGeminiForPolishing(text: string): Promise<AIResponse | null> {
    if (!this.genAI) {
      console.log('❌ callGeminiForPolishing: genAI not available');
      return null;
    }
    
    console.log('📞 callGeminiForPolishing called with text length:', text.length);
    
    const startTime = performance.now();
    
    try {
      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      console.log('📞 Got Gemini model:', MODEL_NAME);
      
      const prompt = `
        Please analyze and polish the following transcribed text. Return a JSON response with the following structure:
        {
          "polishedNoteText": "Your polished markdown text here",
          "chartSuggestion": {
            "type": "bar|pie|line|doughnut",
            "title": "Chart title",
            "data": {
              "labels": ["Label1", "Label2", ...],
              "datasets": [{
                "label": "Dataset name",
                "data": [value1, value2, ...],
                "backgroundColor": ["color1", "color2", ...]
              }]
            },
            "description": "What this chart represents"
          }
        }
        
        Guidelines:
        - Fix grammar, spelling, and punctuation
        - Improve sentence structure and flow
        - Add appropriate markdown formatting (headers, lists, emphasis)
        - If the content contains numerical data, comparisons, categories, or trends, suggest a relevant chart
        - For charts, extract meaningful data from the text and suggest appropriate visualizations
        - Use vibrant, accessible colors for charts
        
        Transcribed text: "${text}"
      `;
      
      console.log('📞 Sending prompt to Gemini...');
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('📞 Raw Gemini response:', responseText);
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('📞 Found JSON in response:', jsonMatch[0]);
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Track performance
        const duration = performance.now() - startTime;
        this.performanceMetrics.apiCallDuration.push(duration);
        console.log('📞 API call completed in', duration, 'ms');
        
        return parsedResponse;
      } else {
        console.log('📞 No JSON found in response, using as polished text');
        // Fallback: use the response as polished text
        return {
          polishedNoteText: responseText,
          chartSuggestion: null
        };
      }
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      throw error;
    }
  }

  private async callGeminiForInsights(text: string): Promise<ContentAnalysis | null> {
    if (!this.genAI) {
      console.log('❌ callGeminiForInsights: genAI not available');
      return null;
    }
    
    console.log('📞 callGeminiForInsights called with text length:', text.length);
    
    try {
      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      console.log('📞 Got Gemini model for insights:', MODEL_NAME);
      
      const prompt = `
        Analyze the following text and return insights in JSON format:
        {
          "topics": ["topic1", "topic2", ...],
          "keyPhrases": ["phrase1", "phrase2", ...],
          "sentiment": {
            "score": number_between_-1_and_1,
            "confidence": number_between_0_and_1,
            "label": "positive|negative|neutral"
          },
          "contentType": "meeting|lecture|notes|brainstorm|general",
          "urgencyLevel": "low|medium|high",
          "actionItems": ["action1", "action2", ...],
          "chartData": {
            "topics": {"topic1": count1, "topic2": count2},
            "sentiment_breakdown": {"positive": count, "negative": count, "neutral": count},
            "word_frequency": {"word1": count1, "word2": count2}
          }
        }
        
        Text to analyze: "${text}"
      `;
      
      console.log('📞 Sending insights prompt to Gemini...');
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('📞 Raw Gemini insights response:', responseText);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('📞 Found JSON in insights response:', jsonMatch[0]);
        return JSON.parse(jsonMatch[0]);
      } else {
        console.log('❌ No JSON found in insights response');
      }
    } catch (error) {
      console.error('❌ Gemini insights call failed:', error);
      throw error;
    }
    
    return null;
  }

  private async generateChartsFromAI(chartSuggestion: any): Promise<void> {
    console.log('📊 generateChartsFromAI() called with:', chartSuggestion);
    console.log('🔍 chartSuggestion type:', typeof chartSuggestion);
    console.log('🔍 chartSuggestion keys:', Object.keys(chartSuggestion || {}));
    
    if (!chartSuggestion || !this.aiChartDisplayArea) {
      console.log('⚠️ No chart suggestion or chart display area not found');
      console.log('🔍 chartSuggestion exists:', !!chartSuggestion);
      console.log('🔍 aiChartDisplayArea exists:', !!this.aiChartDisplayArea);
      console.log('🔍 aiChartDisplayArea element:', this.aiChartDisplayArea);
      return;
    }
    
    console.log('📊 Creating AI chart with suggestion:', chartSuggestion);
    console.log('🔍 Chart suggestion data:', JSON.stringify(chartSuggestion.data, null, 2));
    
    // Clear existing charts first
    console.log('🧹 Clearing existing AI charts...');
    this.clearActiveCharts();
    
    const chartId = `ai-chart-${this.chartIdCounter++}`;
    console.log('🔍 Generated chart ID:', chartId);
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    console.log('🔍 Created chart container element');
    
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>${chartSuggestion.title || 'AI Generated Chart'}</h4>
        <p class="chart-description">${chartSuggestion.description || ''}</p>
      </div>
      <canvas id="${chartId}" width="400" height="200"></canvas>
    `;
    console.log('🔍 Set chart container innerHTML');
    
    console.log('🔍 aiChartDisplayArea before appendChild:', this.aiChartDisplayArea);
    console.log('🔍 aiChartDisplayArea children count before:', this.aiChartDisplayArea.children.length);
    this.aiChartDisplayArea.appendChild(chartContainer);
    console.log('📊 Chart container added to display area');
    console.log('🔍 aiChartDisplayArea children count after:', this.aiChartDisplayArea.children.length);
    
    // Use querySelector on the container to find the canvas directly
    const canvas = chartContainer.querySelector(`#${chartId}`) as HTMLCanvasElement;
    if (!canvas) {
      console.log('❌ Canvas element not found:', chartId);
      console.log('🔍 Available elements with canvas tag:', document.querySelectorAll('canvas').length);
      console.log('🔍 Elements with our chart ID:', document.querySelectorAll(`#${chartId}`).length);
      return;
    }
    console.log('✅ Canvas element found:', canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Canvas context not available');
      return;
    }
    console.log('✅ Canvas context obtained:', ctx);
    
    console.log('📊 Creating Chart.js instance...');
    console.log('🔍 Chart type:', chartSuggestion.type || 'bar');
    console.log('🔍 Chart data structure check:', {
      hasData: !!chartSuggestion.data,
      hasLabels: !!(chartSuggestion.data && chartSuggestion.data.labels),
      hasDatasets: !!(chartSuggestion.data && chartSuggestion.data.datasets),
      labelsLength: chartSuggestion.data?.labels?.length || 0,
      datasetsLength: chartSuggestion.data?.datasets?.length || 0
    });
    const chartConfig = {
      type: chartSuggestion.type || 'bar',
      data: chartSuggestion.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: chartSuggestion.title || 'AI Generated Chart'
          },
          legend: {
            display: true,
            position: 'top' as const
          }
        }
      }
    };
    
    console.log('🔍 Final chart config:', JSON.stringify(chartConfig, null, 2));
    
    try {
      const chart = new Chart(ctx, chartConfig);
      this.activeAiChartInstances.push(chart);
      console.log('✅ Chart created successfully, active charts:', this.activeAiChartInstances.length);
      console.log('🔍 Chart object:', chart);
      console.log('🔍 Chart canvas:', chart.canvas);
      console.log('🔍 Chart canvas parent:', chart.canvas.parentElement);
    } catch (chartError) {
      console.error('❌ Failed to create Chart.js instance:', chartError);
      console.log('🔍 Chart config that caused error:', chartConfig);
    }
  }

  private async generateChartsFromInsights(insights: ContentAnalysis): Promise<void> {
    console.log('📊 generateChartsFromInsights() called with:', insights);
    
    if (!insights.chartData || !this.aiChartDisplayArea) {
      console.log('⚠️ No chart data or chart display area not found');
      console.log('chartData:', insights.chartData);
      console.log('aiChartDisplayArea:', !!this.aiChartDisplayArea);
      return;
    }
    
    console.log('📊 Chart data available:', Object.keys(insights.chartData));
    
    // Generate topic distribution chart
    if (insights.chartData.topics) {
      console.log('📊 Creating topic chart with data:', insights.chartData.topics);
      await this.createTopicChart(insights.chartData.topics);
    }
    
    // Generate sentiment breakdown chart
    if (insights.chartData.sentiment_breakdown) {
      console.log('📊 Creating sentiment chart with data:', insights.chartData.sentiment_breakdown);
      await this.createSentimentChart(insights.chartData.sentiment_breakdown);
    }
    
    // Generate word frequency chart
    if (insights.chartData.word_frequency) {
      console.log('📊 Creating word frequency chart with data:', insights.chartData.word_frequency);
      await this.createWordFrequencyChart(insights.chartData.word_frequency);
    }
    
    console.log('✅ All charts from insights generated');
  }

  private async createTopicChart(topicsData: Record<string, number>): Promise<void> {
    const chartId = `topics-chart-${this.chartIdCounter++}`;
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>Topic Distribution</h4>
        <p class="chart-description">Main topics identified in your transcription</p>
      </div>
      <canvas id="${chartId}" width="400" height="200"></canvas>
    `;
    
    this.aiChartDisplayArea.appendChild(chartContainer);
    
    // Use querySelector on the container to find the canvas directly
    const canvas = chartContainer.querySelector(`#${chartId}`) as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const labels = Object.keys(topicsData);
    const data = Object.values(topicsData);
    const colors = this.generateChartColors(labels.length);
    
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Topic Frequency',
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Topic Distribution'
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        }
      }
    });
    
    this.activeAiChartInstances.push(chart);
  }

  private async createSentimentChart(sentimentData: Record<string, number>): Promise<void> {
    const chartId = `sentiment-chart-${this.chartIdCounter++}`;
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>Sentiment Analysis</h4>
        <p class="chart-description">Emotional tone breakdown of your content</p>
      </div>
      <canvas id="${chartId}" width="400" height="200"></canvas>
    `;
    
    this.aiChartDisplayArea.appendChild(chartContainer);
    
    // Use querySelector on the container to find the canvas directly
    const canvas = chartContainer.querySelector(`#${chartId}`) as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(sentimentData),
        datasets: [{
          label: 'Sentiment Count',
          data: Object.values(sentimentData),
          backgroundColor: [
            '#10b981', // positive - green
            '#ef4444', // negative - red  
            '#f59e0b'  // neutral - amber
          ],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Sentiment Analysis'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    this.activeAiChartInstances.push(chart);
  }

  private async createWordFrequencyChart(wordData: Record<string, number>): Promise<void> {
    const chartId = `words-chart-${this.chartIdCounter++}`;
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
      <div class="chart-header">
        <h4>Key Words</h4>
        <p class="chart-description">Most frequently used words in your transcription</p>
      </div>
      <canvas id="${chartId}" width="400" height="200"></canvas>
    `;
    
    this.aiChartDisplayArea.appendChild(chartContainer);
    
    // Use querySelector on the container to find the canvas directly
    const canvas = chartContainer.querySelector(`#${chartId}`) as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Take top 10 words
    const sortedWords = Object.entries(wordData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    const labels = sortedWords.map(([word]) => word);
    const data = sortedWords.map(([,count]) => count);
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Frequency',
          data: data,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Most Frequent Words'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
    
    this.activeAiChartInstances.push(chart);
  }

  private generateChartColors(count: number): string[] {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#ec4899', // pink
      '#6366f1'  // indigo
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  private updateContentAnalysisDisplay(insights: ContentAnalysis): void {
    // Update detected topics
    const topicsEl = document.getElementById('detectedTopics');
    if (topicsEl && insights.topics) {
      topicsEl.innerHTML = '';
      insights.topics.forEach(topic => {
        const tag = document.createElement('span');
        tag.className = 'topic-tag';
        tag.textContent = topic;
        topicsEl.appendChild(tag);
      });
    }
    
    // Update sentiment
    const sentimentEl = document.getElementById('sentimentAnalysis');
    if (sentimentEl && insights.sentiment) {
      const indicator = sentimentEl.querySelector('.sentiment-indicator');
      const text = sentimentEl.querySelector('.sentiment-text');
      
      if (indicator) {
        indicator.className = `sentiment-indicator ${insights.sentiment.label}`;
      }
      
      if (text) {
        text.textContent = `${insights.sentiment.label} (${Math.round(insights.sentiment.confidence * 100)}%)`;
      }
    }
    
    // Update content type
    const contentTypeEl = document.getElementById('contentType');
    if (contentTypeEl) {
      contentTypeEl.textContent = insights.contentType || 'General';
    }
  }

  // Authentication system initialization
  private initializeAuthenticationSystem(): void {
    console.log('Initializing authentication system...');
    
    try {
      // For now, we'll implement a basic authentication system
      // In production, this would integrate with a real auth service
      
      // Check if user is already authenticated
      const savedUser = localStorage.getItem('voice-notes-user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
          console.log('User restored from storage:', this.currentUser?.email);
        } catch (error) {
          console.error('Failed to parse saved user data:', error);
          localStorage.removeItem('voice-notes-user');
        }
      }
      
      // Initialize authentication UI if not authenticated
      if (!this.currentUser) {
        this.setupAuthenticationUI();
      } else {
        this.initializeUserSession();
      }
      
      console.log('Authentication system initialized');
      
    } catch (error) {
      console.error('Failed to initialize authentication system:', error);
      this.handleError({
        operation: 'initializeAuthenticationSystem',
        details: error,
        userMessage: 'Failed to initialize authentication',
        retryable: false
      });
    }
  }

  private setupAuthenticationUI(): void {
    // Set up authentication modal event listeners
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm') as HTMLFormElement;
    const registerForm = document.getElementById('registerForm') as HTMLFormElement;
    const forgotPasswordForm = document.getElementById('forgotPasswordForm') as HTMLFormElement;
    
    // For demo purposes, we'll allow guest access
    // In production, you would show the auth modal here
    console.log('Setting up guest access for demo purposes');
    
    // Create a guest user
    this.currentUser = {
      id: 'guest-' + Date.now(),
      email: 'guest@voicenotes.demo',
      name: 'Guest User',
      role: 'editor',
      workspaceId: 'demo-workspace',
      lastActive: new Date(),
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: false,
          push: false,
          mentions: false,
          workflowUpdates: false,
          collaborationActivity: false
        },
        privacy: {
          shareAnalytics: false,
          allowMentions: false,
          visibleToTeam: false,
          sharePresence: false
        }
      },
      permissions: ['read', 'write', 'record']
    };
    
    // Save guest user
    localStorage.setItem('voice-notes-user', JSON.stringify(this.currentUser));
    
    this.initializeUserSession();
  }

  private initializeUserSession(): void {
    console.log('Initializing user session...');
    
    if (!this.currentUser) {
      console.error('No current user found');
      return;
    }
    
    // Update last active time
    this.currentUser.lastActive = new Date();
    localStorage.setItem('voice-notes-user', JSON.stringify(this.currentUser));
    
    // Initialize workspace for the user
    if (!this.currentWorkspace) {
      this.currentWorkspace = {
        id: this.currentUser.workspaceId,
        name: 'Demo Workspace',
        ownerId: this.currentUser.id,
        members: [],
        settings: {
          allowGuestAccess: true,
          requireApproval: false,
          defaultRole: 'viewer',
          retentionPeriod: 30,
          encryptionEnabled: false
        },
        usage: {
          storageUsed: 0,
          storageLimit: 1000000,
          monthlyTranscriptionMinutes: 0,
          transcriptionLimit: 1000,
          activeUsers: 1,
          userLimit: 10
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    console.log('User session initialized for:', this.currentUser.name);
  }

  // Priority 3 and 4 features initialization (placeholders)
  private initializePriority3Features(): void {
    console.log('Initializing Priority 3 features...');
    // Smart suggestions, content insights, semantic search
    // These are already implemented in the existing codebase
  }

  private initializePriority4Features(): void {
    console.log('Initializing Priority 4 features...');
    // Multi-modal integration, workflows, file processing
    // These are already implemented in the existing codebase
  }

  // Analytics initialization
  private initializeAnalytics(): void {
    console.log('Initializing analytics system...');
    
    try {
      // Initialize session tracking
      this.currentSession = null;
      this.sessionHistory = [];
      
      // Load session history from storage
      const savedHistory = localStorage.getItem('voice-notes-session-history');
      if (savedHistory) {
        try {
          this.sessionHistory = JSON.parse(savedHistory);
        } catch (error) {
          console.error('Failed to load session history:', error);
        }
      }
      
      console.log('Analytics system initialized');
      
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Storage system initialization
  private initializeStorage(): void {
    console.log('Initializing storage system...');
    
    try {
      // Load note history
      const savedNotes = localStorage.getItem('voice-notes-history');
      if (savedNotes) {
        try {
          this.noteHistory = JSON.parse(savedNotes);
        } catch (error) {
          console.error('Failed to load note history:', error);
        }
      }
      
      // Set up auto-save
      this.setupAutoSave();
      
      console.log('Storage system initialized');
      
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  // Performance optimizations
  private initializePerformanceOptimizations(): void {
    console.log('Initializing performance optimizations...');
    
    try {
      // Set up debounced and throttled functions
      this.debouncedUpdateTranscription = this.debounce((text: string) => {
        this.updatePolishedNote();
      }, PERFORMANCE_CONFIG.DEBOUNCE_DELAY);
      
      this.throttledDrawWaveform = this.throttle(() => {
        this.updateVoiceActivity();
      }, PERFORMANCE_CONFIG.WAVEFORM_THROTTLE);
      
      this.throttledUpdateTimer = this.throttle(() => {
        this.updateAnalyticsDisplay();
      }, PERFORMANCE_CONFIG.THROTTLE_DELAY);
      
      console.log('Performance optimizations initialized');
      
    } catch (error) {
      console.error('Failed to initialize performance optimizations:', error);
    }
  }

  // Network status checking
  private checkNetworkStatus(): void {
    this.isOnline = navigator.onLine;
    console.log('Network status:', this.isOnline ? 'online' : 'offline');
  }

  // Auto-save setup
  private setupAutoSave(): void {
    if (this.autoSaveIntervalId) {
      clearInterval(this.autoSaveIntervalId);
    }
    
    this.autoSaveIntervalId = window.setInterval(() => {
      if (this.finalTranscript.trim()) {
        this.saveCurrentNote();
        
        if (this.autoSaveIndicator) {
          this.autoSaveIndicator.textContent = 'Auto-saved';
          this.autoSaveIndicator.style.opacity = '1';
          
          setTimeout(() => {
            if (this.autoSaveIndicator) {
              this.autoSaveIndicator.style.opacity = '0';
            }
          }, 2000);
        }
      }
    }, 30000); // Auto-save every 30 seconds
  }

  // Utility functions for performance
  private debounce(func: Function, delay: number): (...args: any[]) => void {
    let timeoutId: number;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func.apply(this, args), delay);
    };
  }

  private throttle(func: Function, delay: number): (...args: any[]) => void {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  // Testing and feature status methods (placeholders)
  private testPriority3Features(): void {
    // ⚠️ DISABLED TO PREVENT INFINITE CHART GENERATION
    // console.log('Testing Priority 3 features...');
  }

  private testCrossFeatureIntegration(): void {
    // ⚠️ DISABLED TO PREVENT INFINITE CHART GENERATION
    // console.log('Testing cross-feature integration...');
  }

  private testPriority4Features(): void {
    // ⚠️ DISABLED TO PREVENT INFINITE CHART GENERATION
    // console.log('Testing Priority 4 features...');
  }

  private optimizePriority3Performance(): void {
    // Cleanup and optimization for Priority 3 features
  }

  private optimizePriority4Performance(): void {
    // Cleanup and optimization for Priority 4 features
  }

  private createFeatureStatusDashboard(): void {
    console.log('Feature status dashboard created');
  }

  // Cleanup method to prevent memory leaks and stop intervals
  private cleanup(): void {
    // Clear all intervals
    if (this.autoSaveIntervalId) {
      clearInterval(this.autoSaveIntervalId);
      this.autoSaveIntervalId = null;
    }
    
    if (this.performanceOptimizationInterval) {
      clearInterval(this.performanceOptimizationInterval);
      this.performanceOptimizationInterval = null;
    }
    
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    
    // Clear all chart instances
    this.clearActiveCharts();
    
    console.log('✅ Cleanup completed - all intervals cleared');
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing VoiceNotesApp...');
  try {
    const app = new VoiceNotesApp();
    
    // Expose app to global scope for debugging and external scripts
    (window as any).app = app;
    
    console.log('VoiceNotesApp initialized successfully');
    
    // ⚠️ AUTO-TESTING DISABLED TO PREVENT INFINITE CHART GENERATION
    // Uncomment the lines below if you want to test chart functionality manually
    /*
    // Auto-test chart generation after 2 seconds to allow page to fully load
    setTimeout(() => {
      console.log('🧪 Auto-testing chart generation...');
      app.testChartGeneration();
      
      // Also test AI polishing with sample data that should trigger charts
      setTimeout(() => {
        app.testAIPolishingWithCharts();
      }, 3000);
    }, 2000); // Wait 2 seconds for full initialization
    */
    
    console.log('App available at window.app');
    console.log('💡 To test charts manually, use: window.app.testChartGeneration() or click the red chart button');
  } catch (error) {
    console.error('Failed to initialize VoiceNotesApp:', error);
  }
});