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

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}
