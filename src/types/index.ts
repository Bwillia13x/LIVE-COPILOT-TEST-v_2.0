/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
}

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

export interface ErrorContext {
  operation: string;
  details?: unknown; // Changed from any to unknown
  userMessage: string;
  retryable: boolean;
  retryAction?: () => void;
}

export interface StoredNote {
  id: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
  title: string;
  isAutoSaved: boolean;
}

export interface ExportOptions {
  format: 'markdown' | 'plain' | 'html';
  includeRaw: boolean;
  includeCharts: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Add additional type definitions for the refactored application
export interface AppState {
  isRecording: boolean;
  currentNote: Note | null;
  notes: Note[];
  isProcessing: boolean;
  errors: ErrorContext[];
}

import { ChartOptions as CJChartOptions, ChartType as CJChartType } from 'chart.js';

// Basic Chart Data Structures (aligning with Chart.js structure)
export interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  // Add other common dataset properties used in the app, e.g., from COLORS constants
  hoverOffset?: number;
}

export interface BaseChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Refined ChartConfig using Chart.js types if possible, or our defined BaseChartData
export interface ChartConfig {
  type: CJChartType; // Use Chart.js's own ChartType
  data: BaseChartData;
  options?: CJChartOptions; // Use Chart.js's ChartOptions, make it optional
}

// Specific data structures for AI responses / ChartManager inputs
export interface TopicDataInput { // Renamed from TopicDataPayload to avoid confusion with API payload
  labels: string[];
  data: number[]; // Percentages
  backgroundColor?: string[];
}

export interface SentimentDataInput {
  labels: string[]; // e.g., ['Positive', 'Neutral', 'Negative']
  data: number[]; // Values/percentages
  backgroundColor?: string[];
}

export interface WordFrequencyInput {
  labels: string[]; // Words
  data: number[]; // Frequencies
  backgroundColor?: string[];
}

// Union type for data inputs to specific chart functions in ChartManager
export type SpecificChartInputData = TopicDataInput | SentimentDataInput | WordFrequencyInput;

// Data structure for API responses for chart data
// This is what the AI is expected to return per chart type
export interface AIChartDataPayload {
  labels: string[];
  data: number[];
  backgroundColor?: string[]; // Provided by AI based on prompt
  // Potentially other AI-provided fields like title suggestions, descriptions etc.
}

// If 'all' chart types are requested from API
export interface AllAIChartData {
  topics?: AIChartDataPayload;
  sentiment?: AIChartDataPayload;
  wordFrequency?: AIChartDataPayload;
  // other potential chart types can be added here
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// For PerformanceMonitor
export interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  // Add other properties if needed based on actual usage
}

// For ProductionMonitor error queue
export interface ErrorReport {
  type: string;
  data: Record<string, unknown>; // Was Record<string, any>
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface ManagedFile {
  id: string;
  fileObject: File; // Store the actual File object
  name: string;
  type: string;
  size: number;
  lastModified: number;
  textContent?: string; // New field for extracted text content
}

// Basic interfaces for SpeechRecognition events used in AudioRecorder.ts
// These can be expanded if more properties are accessed.
export interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

export interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResult[];
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

// A minimal interface for the SpeechRecognition object itself
export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Workflow System Types

export enum TriggerType {
  MANUAL = 'MANUAL', // For actions triggered directly by user from workflow panel
  NEW_FILE_UPLOADED = 'NEW_FILE_UPLOADED',
  KEYWORD_DETECTED_MAIN_NOTE = 'KEYWORD_DETECTED_MAIN_NOTE',
  // Future: KEYWORD_DETECTED_IN_FILE = 'KEYWORD_DETECTED_IN_FILE',
  // Future: SENTIMENT_THRESHOLD_CROSSED = 'SENTIMENT_THRESHOLD_CROSSED',
  // Future: SPECIFIC_TOPIC_IDENTIFIED = 'SPECIFIC_TOPIC_IDENTIFIED',
  // Future: NOTE_SAVED = 'NOTE_SAVED',
}

export enum ActionType {
  SUMMARIZE_CONTENT = 'SUMMARIZE_CONTENT',
  TRANSLATE_CONTENT = 'TRANSLATE_CONTENT',
  CONSOLIDATE_TOPICS = 'CONSOLIDATE_TOPICS',
  // Future: EXTRACT_ACTION_ITEMS = 'EXTRACT_ACTION_ITEMS',
  // Future: SAVE_TO_CLOUD = 'SAVE_TO_CLOUD',
  // Future: SEND_NOTIFICATION = 'SEND_NOTIFICATION',
}

// Base and Specific Interfaces for Workflow Action Parameters
export interface BaseWorkflowActionParams {}

export interface TranslateActionParams extends BaseWorkflowActionParams {
  targetLanguage: string;
}
// Example for future extension:
// export interface SummarizeActionParams extends BaseWorkflowActionParams {
//   summaryLength?: 'short' | 'medium' | 'long';
// }

// Union type for all possible action parameters
export type WorkflowActionParamsUnion = BaseWorkflowActionParams | TranslateActionParams; // Add other param types here

export interface WorkflowAction {
  id: string; // Unique ID for this action instance within a workflow
  type: ActionType;
  parameters: WorkflowActionParamsUnion;
  // Optional: specify input source for the action, defaults to aggregated content or trigger output
  // inputSource?: 'triggerOutput' | 'aggregatedContent' | 'mainNote' | 'specificFileById';
}

// Base and Specific Interfaces for Trigger Parameters
export interface BaseTriggerParams {}

export interface KeywordDetectedTriggerParams extends BaseTriggerParams {
  keywords: string[];
}

export interface NewFileUploadedTriggerParams extends BaseTriggerParams {
  fileTypePattern?: string; // e.g., 'image/*' or '.pdf'
}

// Union type for all possible trigger parameters
export type TriggerParamsUnion = BaseTriggerParams | KeywordDetectedTriggerParams | NewFileUploadedTriggerParams;

// Interface for Workflow Triggers (though simplified for initial implementation)
export interface WorkflowTrigger {
  id: string; // Unique ID for this trigger configuration
  type: TriggerType;
  parameters: TriggerParamsUnion;
}

// Interface for Workflows
export interface Workflow {
  id: string; // Unique ID for the workflow
  name: string;
  isEnabled: boolean;
  // Simplified embedded trigger definition for initial keyword-based workflow.
  // This can be evolved to an array of trigger IDs (triggerIds: string[])
  // and a separate list of WorkflowTrigger objects if a workflow needs to respond
  // to multiple, independently defined triggers.
  trigger: {
    type: TriggerType;
    parameters: TriggerParamsUnion; // Specifically KeywordDetectedTriggerParams for keyword trigger
  };
  actions: WorkflowAction[]; // Sequence of actions to perform
  // Optional future enhancements:
  // conditions?: WorkflowCondition[];
  // lastRun?: Date;
  // runCount?: number;
}
