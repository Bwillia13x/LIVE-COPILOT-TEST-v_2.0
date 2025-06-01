/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { APIResponse, AllAIChartData, AIChartDataPayload } from '../types/index.js';
import { ERROR_MESSAGES, STORAGE_KEYS, CHART_TYPES } from '../constants.js'; // API_CONFIG removed
import { ErrorHandler } from '../utils.js';
import { AppConfig } from '../config/AppConfig.js'; // Import AppConfig

export class APIService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.initializeAPI();
  }

  private async initializeAPI(): Promise<void> {
    try {
      // Get API key: Prioritize localStorage, then AppConfig (env), then null
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      const envApiKey = AppConfig.getGeminiApiKey(); // Gets from env

      this.apiKey = (storedKey?.trim()) || envApiKey;
      
      if (this.apiKey && this.apiKey.length > 10) {
        try {
          this.genAI = new GoogleGenAI(this.apiKey);
          console.log('🔑 API service initialized with API key');
        } catch (genAIError) {
          ErrorHandler.logError('Failed to initialize GoogleGenAI during API setup', genAIError instanceof Error ? genAIError : new Error(String(genAIError)));
          this.genAI = null;
          this.apiKey = null;
        }
      } else {
        console.log('ℹ️ No valid API key available - API service ready for key configuration');
        this.genAI = null;
        this.apiKey = null;
      }
    } catch (error) { // error is unknown
      ErrorHandler.logError('API initialization failed', error instanceof Error ? error : new Error(String(error)));
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

      const model = (this.genAI as any).getGenerativeModel({ model: AppConfig.getDefaultModelName() }); // Use AppConfig
      const result = await model.generateContent('Test connection');
      
      return {
        success: true,
        data: true
      };
    } catch (error) { // error is unknown
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ErrorHandler.logError('API connection test failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: `API connection failed: ${errorMessage}`
      };
    }
  }

  private async _executePrompt(prompt: string, operationNameForLogging: string): Promise<APIResponse<string>> {
    if (!this.genAI) {
      ErrorHandler.logError(ERROR_MESSAGES.API.API_KEY_MISSING, operationNameForLogging);
      return { success: false, error: ERROR_MESSAGES.API.API_KEY_MISSING };
    }
    try {
      const model = (this.genAI as any).getGenerativeModel({ model: AppConfig.getDefaultModelName() }); // Use AppConfig
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      return { success: true, data: textResponse };
    } catch (error) { // error is unknown
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI error';
      ErrorHandler.logError(`${operationNameForLogging} failed during AI interaction`, error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: `AI interaction failed for ${operationNameForLogging}: ${errorMessage}`,
      };
    }
  }

  public async polishTranscription(rawText: string): Promise<APIResponse<string>> {
    const operationName = 'Transcription polishing';
    const prompt = `Please improve the following transcription by:
1. Correcting grammar and spelling
2. Adding proper punctuation
3. Making it more readable while maintaining the original meaning
4. Organizing thoughts into clear paragraphs

Transcription: "${rawText}"

Please provide only the improved text without any additional comments or explanations.`;

    // The _executePrompt method already handles the try/catch and API key check.
    // It returns an APIResponse<string> which matches this method's signature.
    return this._executePrompt(prompt, operationName);
  }

  // Updated to reflect that chartType 'all' returns AllAIChartData, others return AIChartDataPayload
  public async generateChartData(transcription: string, chartType: string): Promise<APIResponse<AllAIChartData | AIChartDataPayload>> {
    const operationName = `Chart data generation for ${chartType}`;
    let prompt = '';
      // If chartType is 'all', we might need a different prompt or multiple calls.
      // For now, this example assumes specific chart type prompts.
      // The 'all' case in AudioTranscriptionApp will need to iterate or API needs to support it.
      // Let's assume for now `generateChartData` is called per specific type by the app,
      // or an 'all' type prompt returns a structured AllAIChartData.
      // For simplicity, this example will assume chartType is specific for now.
      // If chartType === 'all', the prompt and parsing logic would be more complex.
      switch (chartType) {
        case CHART_TYPES.TOPICS: // Use constant
          prompt = this.getTopicsPrompt(transcription);
          break;
        case CHART_TYPES.SENTIMENT: // Use constant
          prompt = this.getSentimentPrompt(transcription);
          break;
        case CHART_TYPES.WORD_FREQUENCY: // Use constant
          prompt = this.getWordFrequencyPrompt(transcription);
          break;
        default:
          if (chartType !== CHART_TYPES.ALL) { // Use constant
            ErrorHandler.logError(`Unsupported chart type: ${chartType}`, operationName);
            return { success: false, error: `Unsupported chart type: ${chartType}`};
          }
          prompt = `Analyze the following transcription and provide data for topics, sentiment, and word frequency charts. Transcription: "${transcription}". Respond in JSON format with keys "topics", "sentiment", "wordFrequency", each containing respective data.`;
          break;
      }

    const aiResponse = await this._executePrompt(prompt, operationName);

    if (!aiResponse.success || !aiResponse.data) {
      return { success: false, error: aiResponse.error || 'Failed to get data from AI for charts.' };
    }

    try {
      const parsedData = JSON.parse(aiResponse.data);
      // Type assertion can be tricky here. Assuming 'all' returns AllAIChartData, and specific types return AIChartDataPayload.
      const chartData = (chartType === CHART_TYPES.ALL ? parsedData : parsedData) as AllAIChartData | AIChartDataPayload;
      return { success: true, data: chartData };
    } catch (parseError) { // parseError is unknown
      const errorMessage = parseError instanceof Error ? parseError.message : 'JSON parsing error';
      ErrorHandler.logError(`Failed to parse JSON response for ${operationName}`, parseError instanceof Error ? parseError : new Error(String(parseError)));
      return {
        success: false,
        error: `Failed to parse chart data: ${errorMessage}` // Corrected to use errorMessage from parseError
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
      localStorage.setItem(STORAGE_KEYS.API_KEY, this.apiKey); // Use constant
      this.genAI = new GoogleGenAI(this.apiKey as any);
      console.log('🔑 API key set and service initialized successfully');
    } catch (error) { // error is unknown
      ErrorHandler.logError('Failed to set API key', error instanceof Error ? error : new Error(String(error)));
      this.apiKey = null;
      this.genAI = null;
    }
  }

  public hasValidApiKey(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
