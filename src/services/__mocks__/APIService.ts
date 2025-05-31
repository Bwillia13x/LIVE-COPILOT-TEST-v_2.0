// src/services/__mocks__/APIService.ts

// This is a manual mock for APIService.ts
// It needs to provide the same interface as the original module.

export class APIService {
  private apiKey: string | null = 'mock-api-key'; // Default mock API key

  constructor() {
    console.log('Mock APIService constructor called');
    // Attempt to get API key from the global mock, if available from jest.setup.js
    // This makes the mock slightly more dynamic if needed, but not strictly necessary
    // if the methods are fully mocked in the test.
    if (global.import && global.import.meta && global.import.meta.env) {
      this.apiKey = global.import.meta.env.VITE_GEMINI_API_KEY || 'mock-api-key';
    }
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
    console.log(`Mock APIService: API key set to ${key}`);
  }

  public hasValidApiKey(): boolean {
    return !!this.apiKey;
  }

  public async polishTranscription(transcript: string): Promise<{ success: boolean; data?: string; error?: string }> {
    console.log(`Mock APIService: polishTranscription called with "${transcript}"`);
    if (!this.hasValidApiKey()) {
      return Promise.resolve({ success: false, error: 'Mock API Key not set' });
    }
    // This will be overridden by jest.fn().mockResolvedValue(...) in the test,
    // but good to have a default behavior.
    return Promise.resolve({ success: true, data: `polished mock for: ${transcript}` });
  }

  public async generateChartData(transcript: string): Promise<any> {
    console.log(`Mock APIService: generateChartData called with "${transcript}"`);
    if (!this.hasValidApiKey()) {
      return Promise.reject('Mock API Key not set');
    }
    return Promise.resolve({
      topics: { labels: ['mockTopic'], datasets: [{ data: [1] }] },
      sentiment: { labels: ['mockSentiment'], datasets: [{ data: [1] }] },
    });
  }

  public async generateSampleChartData(): Promise<any> {
    console.log(`Mock APIService: generateSampleChartData called`);
    return Promise.resolve({
      topics: { labels: ['sampleTopic'], datasets: [{ data: [1] }] },
      sentiment: { labels: ['sampleSentiment'], datasets: [{ data: [1] }] },
    });
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    console.log('Mock APIService: testConnection called');
    if (this.hasValidApiKey()) {
      return { success: true };
    }
    return { success: false, error: 'Mock API Key not set' };
  }
}
