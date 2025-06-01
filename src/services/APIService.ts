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

    return this._executePrompt(prompt, operationName);
  }

  public async generateChartData(transcription: string, chartType: string): Promise<APIResponse<AllAIChartData | AIChartDataPayload>> {
    const operationName = `Chart data generation for ${chartType}`;
    let prompt = '';
      switch (chartType) {
        case CHART_TYPES.TOPICS:
          prompt = this.getTopicsPrompt(transcription);
          break;
        case CHART_TYPES.SENTIMENT:
          prompt = this.getSentimentPrompt(transcription);
          break;
        case CHART_TYPES.WORD_FREQUENCY:
          prompt = this.getWordFrequencyPrompt(transcription);
          break;
        default:
          if (chartType !== CHART_TYPES.ALL) {
            ErrorHandler.logError(`Unsupported chart type: ${chartType}`, operationName);
            return { success: false, error: `Unsupported chart type: ${chartType}`};
          }
          prompt = `Analyze the following transcription and provide data for topics, sentiment, and word frequency charts. Transcription: "${transcription}". Respond in JSON format with keys "topics", "sentiment", "wordFrequency", each containing respective data. For topics, provide labels (array of strings) and data (array of numbers for percentages). For sentiment, provide labels ["Positive", "Neutral", "Negative"] and data (percentages). For wordFrequency, provide labels (array of strings - top 10 significant words) and data (their frequencies). Ensure percentages add up to 100 where applicable. Ensure all string values in JSON are double-quoted.`;
          break;
      }

    const aiResponse = await this._executePrompt(prompt, operationName);

    if (!aiResponse.success || !aiResponse.data) {
      return { success: false, error: aiResponse.error || 'Failed to get data from AI for charts.' };
    }

    try {
      const parsedData = JSON.parse(aiResponse.data);
      const chartData = (chartType === CHART_TYPES.ALL ? parsedData : parsedData) as AllAIChartData | AIChartDataPayload;
      return { success: true, data: chartData };
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'JSON parsing error';
      ErrorHandler.logError(`Failed to parse JSON response for ${operationName}`, parseError instanceof Error ? parseError : new Error(String(parseError)));
      return {
        success: false,
        error: `Failed to parse chart data: ${errorMessage}. Raw AI response: ${aiResponse.data}`
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

The percentages should add up to 100. Ensure all string values in JSON are double-quoted. Transcription: "${transcription}"`;
  }

  private getSentimentPrompt(transcription: string): string {
    return `Analyze the sentiment of the following transcription and return a JSON object with sentiment analysis:
{
  "labels": ["Positive", "Neutral", "Negative"],
  "data": [positivePercentage, neutralPercentage, negativePercentage],
  "backgroundColor": ["#4CAF50", "#FFC107", "#F44336"]
}

The percentages should add up to 100. Ensure all string values in JSON are double-quoted. Transcription: "${transcription}"`;
  }

  private getWordFrequencyPrompt(transcription: string): string {
    return `Analyze the word frequency in the following transcription and return the top 10 most significant words (excluding common words like "the", "and", "is", etc.) as a JSON object:
{
  "labels": ["word1", "word2", "word3", ...],
  "data": [frequency1, frequency2, frequency3, ...],
  "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", ...]
}
Ensure all string values in JSON are double-quoted. Transcription: "${transcription}"`;
  }

  public async getConsolidatedTopics(combinedText: string): Promise<APIResponse<string[]>> {
    const operationName = "Consolidated Topic Analysis";
    const prompt = `Based on the following combined text from a main note and potentially several related documents, please identify and extract the 3 to 5 most significant topics. Return these topics as a valid JSON array of strings. For example: ["Topic A", "Topic B", "Topic C"]. Ensure the output is ONLY the JSON array.

Combined Text:
---
${combinedText}
---`;

    const response = await this._executePrompt(prompt, operationName);

    if (response.success && response.data) {
      try {
        const topics = JSON.parse(response.data) as string[];
        if (!Array.isArray(topics) || !topics.every(topic => typeof topic === 'string')) {
            throw new Error("API did not return a valid JSON array of strings for topics.");
        }
        return { success: true, data: topics };
      } catch (parseError) {
        ErrorHandler.logError("Failed to parse consolidated topics from API response", { error: parseError, rawResponse: response.data });
        return { success: false, error: "Failed to parse topics from API response. Ensure the AI is returning a valid JSON array of strings." };
      }
    }
    return { success: false, error: response.error || "Failed to get consolidated topics from API." };
  }

  public async getAutomatedSummary(textToSummarize: string): Promise<APIResponse<string>> {
    const operationName = "Automated Summary Generation";
    const prompt = `Please provide a concise summary (2-3 sentences) of the following text:

---
${textToSummarize}
---

Ensure the summary is well-written and captures the key points.`;

    const response = await this._executePrompt(prompt, operationName);

    if (response.success && response.data) {
      return { success: true, data: response.data.trim() };
    }
    return { success: false, error: response.error || "Failed to get automated summary." };
  }

  public async generateSampleChartData(): Promise<APIResponse<AllAIChartData>> {
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
      localStorage.setItem(STORAGE_KEYS.API_KEY, this.apiKey);
      this.genAI = new GoogleGenAI(this.apiKey as any);
      console.log('🔑 API key set and service initialized successfully');
    } catch (error) {
      ErrorHandler.logError('Failed to set API key', error instanceof Error ? error : new Error(String(error)));
      this.apiKey = null;
      this.genAI = null;
    }
  }

  public hasValidApiKey(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
