/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { APIResponse } from '../types/index.js';
import { API_CONFIG, ERROR_MESSAGES } from '../constants.js';
import { ErrorHandler } from '../utils.js';

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export class APIService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.initializeAPI();
  }

  private async initializeAPI(): Promise<void> {
    try {
      this.apiKey = localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY;
      if (this.apiKey) {
        this.genAI = new GoogleGenAI(this.apiKey);
      }
    } catch (error) {
      ErrorHandler.logError('API initialization failed', error);
    }
  }

  public async testConnection(): Promise<APIResponse<boolean>> {
    try {
      if (!this.genAI) {
        return {
          success: false,
          error: ERROR_MESSAGES.API_KEY_MISSING
        };
      }

      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent('Test connection');
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `API connection failed: ${error.message}`
      };
    }
  }

  public async polishTranscription(rawText: string): Promise<APIResponse<string>> {
    try {
      if (!this.genAI) {
        throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
      }

      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt = `Please improve the following transcription by:
1. Correcting grammar and spelling
2. Adding proper punctuation
3. Making it more readable while maintaining the original meaning
4. Organizing thoughts into clear paragraphs

Transcription: "${rawText}"

Please provide only the improved text without any additional comments or explanations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const polishedText = response.text();

      return {
        success: true,
        data: polishedText
      };
    } catch (error) {
      ErrorHandler.logError('Transcription polishing failed', error);
      return {
        success: false,
        error: `Failed to polish transcription: ${error.message}`
      };
    }
  }

  public async generateChartData(transcription: string, chartType: string): Promise<APIResponse<any>> {
    try {
      if (!this.genAI) {
        throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
      }

      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      
      let prompt = '';
      switch (chartType) {
        case 'topics':
          prompt = this.getTopicsPrompt(transcription);
          break;
        case 'sentiment':
          prompt = this.getSentimentPrompt(transcription);
          break;
        case 'wordFrequency':
          prompt = this.getWordFrequencyPrompt(transcription);
          break;
        default:
          throw new Error(`Unknown chart type: ${chartType}`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const chartData = JSON.parse(response.text());

      return {
        success: true,
        data: chartData
      };
    } catch (error) {
      ErrorHandler.logError(`Chart generation failed for type: ${chartType}`, error);
      return {
        success: false,
        error: `Failed to generate chart data: ${error.message}`
      };
    }
  }

  private getTopicsPrompt(transcription: string): string {
    return `Analyze the following transcription and identify the main topics discussed. Return a JSON object with the following structure:
{
  "labels": ["Topic 1", "Topic 2", "Topic 3"],
  "data": [percentage1, percentage2, percentage3],
  "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
}

The percentages should add up to 100. Transcription: "${transcription}"`;
  }

  private getSentimentPrompt(transcription: string): string {
    return `Analyze the sentiment of the following transcription and return a JSON object with sentiment analysis:
{
  "labels": ["Positive", "Neutral", "Negative"],
  "data": [positivePercentage, neutralPercentage, negativePercentage],
  "backgroundColor": ["#4CAF50", "#FFC107", "#F44336"]
}

The percentages should add up to 100. Transcription: "${transcription}"`;
  }

  private getWordFrequencyPrompt(transcription: string): string {
    return `Analyze the word frequency in the following transcription and return the top 10 most significant words (excluding common words like "the", "and", "is", etc.) as a JSON object:
{
  "labels": ["word1", "word2", "word3", ...],
  "data": [frequency1, frequency2, frequency3, ...],
  "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", ...]
}

Transcription: "${transcription}"`;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('geminiApiKey', apiKey);
    this.genAI = new GoogleGenAI(apiKey);
  }

  public hasValidApiKey(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
