import { describe, it, expect } from 'vitest';
import { ErrorHandler } from './utils';

describe('ErrorHandler', () => {
  const errorHandler = ErrorHandler.getInstance(); // Get instance

  describe('isNetworkError', () => {
    it('should return true for error messages containing "network"', () => {
      expect(errorHandler.isNetworkError(new Error('A network error occurred'))).toBe(true);
    });

    it('should return true for error messages containing "timeout"', () => {
      expect(errorHandler.isNetworkError(new Error('Request timeout'))).toBe(true);
    });

    it('should return true for error messages containing "fetch"', () => {
      expect(errorHandler.isNetworkError(new Error('Failed to fetch'))).toBe(true);
    });

    it('should return true for error messages containing "connection"', () => {
      expect(errorHandler.isNetworkError(new Error('Connection refused'))).toBe(true);
    });

    it('should return true for error messages containing "cors"', () => {
      expect(errorHandler.isNetworkError(new Error('CORS error'))).toBe(true);
    });

    it('should return true for error messages containing "offline"', () => {
      expect(errorHandler.isNetworkError(new Error('Client is offline'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(errorHandler.isNetworkError(new Error('NETWORK error'))).toBe(true);
    });

    it('should return false for non-network error messages', () => {
      expect(errorHandler.isNetworkError(new Error('Some other error'))).toBe(false);
      expect(errorHandler.isNetworkError(new Error('Null pointer exception'))).toBe(false);
    });

    it('should return false for empty error message', () => {
      expect(errorHandler.isNetworkError(new Error(''))).toBe(false);
    });
  });
});
