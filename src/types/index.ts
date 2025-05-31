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
  details?: any;
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
