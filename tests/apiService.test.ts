import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: vi.fn() }))
}));

import { APIService } from '../src/services/APIService.js';

describe('APIService', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores API key in sessionStorage when set', () => {
    const service = new APIService();
    service.setApiKey('test-key-123456');
    expect(sessionStorage.getItem('geminiApiKey')).toBe('test-key-123456');
  });

  it('initializes with existing key from sessionStorage', () => {
    sessionStorage.setItem('geminiApiKey', 'existing-key-12345');
    const service = new APIService();
    expect(service.hasValidApiKey()).toBe(true);
  });
});
