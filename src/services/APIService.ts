/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { APIResponse, AllAIChartData, AIChartDataPayload } from '../types/index.js'; // Added AllAIChartData, AIChartDataPayload
import { ERROR_MESSAGES } from '../constants.js';
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
      // Get API key from localStorage or environment variables
      const storedKey = localStorage.getItem('geminiApiKey');
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      // Only use the key if it's not null, undefined, or empty
      this.apiKey = (storedKey && storedKey.trim()) || (envKey && envKey.trim()) || null;
      
      if (this.apiKey && this.apiKey.length > 10) { // Basic validation for API key format
        try {
          this.genAI = new GoogleGenAI(this.apiKey as any);
          console.log('🔑 API service initialized with API key');
        } catch (genAIError: any) {
          ErrorHandler.logError('Failed to initialize GoogleGenAI during API setup', genAIError);
          this.genAI = null;
          this.apiKey = null;
        }
      } else {
        console.log('ℹ️ No valid API key available - API service ready for key configuration');
        this.genAI = null;
        this.apiKey = null;
      }
    } catch (error: any) {
      ErrorHandler.logError('API initialization failed', error);
      this.genAI = null;
      this.apiKey = null;
    }
  }

  public async testConnection(): Promise<APIResponse<boolean>> {
    try {
      if (!this.genAI) {
        ErrorHandler.logWarning(ERROR_MESSAGES.API.API_KEY_MISSING, 'testConnection');
        return {
          success: false,
          error: ERROR_MESSAGES.API.API_KEY_MISSING
        };
      }

      const model = (this.genAI as any).getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent('Test connection');
      
      return {
        success: true,
        data: true
      };
    } catch (error: any) {
      ErrorHandler.logError('API connection test failed', error);
      return {
        success: false,
        error: `API connection failed: ${error?.message || 'Unknown error'}`
      };
    }
  }

  public async polishTranscription(rawText: string): Promise<APIResponse<string>> {
    try {
      if (!this.genAI) {
        throw new Error(ERROR_MESSAGES.API.API_KEY_MISSING);
      }

      const model = (this.genAI as any).getGenerativeModel({ model: MODEL_NAME });
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
    } catch (error: any) {
      ErrorHandler.logError('Transcription polishing failed', error);
      return {
        success: false,
        error: `Failed to polish transcription: ${error?.message || 'Unknown error'}`
      };
    }
  }

  // Updated to reflect that chartType 'all' returns AllAIChartData, others return AIChartDataPayload
  public async generateChartData(transcription: string, chartType: string): Promise<APIResponse<AllAIChartData | AIChartDataPayload>> {
    try {
      if (!this.genAI) {
        throw new Error(ERROR_MESSAGES.API.API_KEY_MISSING);
      }

      const model = (this.genAI as any).getGenerativeModel({ model: MODEL_NAME });
      
      let prompt = '';
      // If chartType is 'all', we might need a different prompt or multiple calls.
      // For now, this example assumes specific chart type prompts.
      // The 'all' case in AudioTranscriptionApp will need to iterate or API needs to support it.
      // Let's assume for now `generateChartData` is called per specific type by the app,
      // or an 'all' type prompt returns a structured AllAIChartData.
      // For simplicity, this example will assume chartType is specific for now.
      // If chartType === 'all', the prompt and parsing logic would be more complex.
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
        // Removed 'default' throw to allow for an 'all' type if the prompt/API supports it.
        // If 'all' is passed, a generic prompt or multi-prompt strategy would be needed.
        // For now, assume specific types or an 'all' prompt that returns AllAIChartData.
        default: // Assuming 'all' or other combined types might fall here or have their own prompt
          if (chartType !== 'all') { // if it's not 'all', then it's unknown
            throw new Error(`Unsupported chart type for direct generation: ${chartType}. Use 'all' for combined data.`);
          }
          // Placeholder for 'all' prompt - this would need to be designed
          // For this example, we'll assume an 'all' type prompt returns data matching AllAIChartData structure.
          prompt = `Analyze the following transcription and provide data for topics, sentiment, and word frequency charts. Transcription: "${transcription}". Respond in JSON format with keys "topics", "sentiment", "wordFrequency", each containing respective data.`;
          break;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      // Type assertion based on chartType
      const parsedData = JSON.parse(response.text());
      const chartData = (chartType === 'all' ? parsedData : parsedData) as AllAIChartData | AIChartDataPayload;


      return {
        success: true,
        data: chartData
      };
    } catch (error: any) {
      ErrorHandler.logError(`Chart data generation failed for type: ${chartType}`, error);
      return {
        success: false,
        error: `Failed to generate chart data: ${error?.message || 'Unknown error'}`
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

  // Added for generateSampleChartData
  public async generateSampleChartData(): Promise<APIResponse<AllAIChartData>> {
    // This is a mock implementation. In a real scenario, this might call a different API endpoint
    // or use predefined sample data.
    console.log("APIService: Generating sample chart data (mocked)");
    const sampleData: AllAIChartData = {
      topics: {
        labels: ['Technology', 'Health', 'Finance'],
        data: [40, 30, 30],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      },
      sentiment: {
        labels: ['Positive', 'Neutral', 'Negative'],
        data: [60, 25, 15],
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      },
      wordFrequency: {
        labels: ['ai', 'learning', 'data', 'voice', 'app'],
        data: [25, 22, 18, 15, 12],
        backgroundColor: ['#FF9900', '#3366CC', '#DC3912', '#109618', '#990099'],
      }
    };
    return { success: true, data: sampleData };
  }

  public setApiKey(apiKey: string): void {
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 10) {
      ErrorHandler.logWarning('Invalid API key provided for setting.', 'setApiKey');
      return;
    }
    
    try {
      this.apiKey = apiKey.trim();
      localStorage.setItem('geminiApiKey', this.apiKey);
      this.genAI = new GoogleGenAI(this.apiKey as any);
      console.log('🔑 API key set and service initialized successfully');
    } catch (error: any) {
      ErrorHandler.logError('Failed to set API key', error);
      this.apiKey = null;
      this.genAI = null;
    }
  }

  public hasValidApiKey(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
