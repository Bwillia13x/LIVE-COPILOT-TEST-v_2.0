import { describe, it, expect } from 'vitest';
import { AudioRecorder } from './AudioRecorder';

describe('AudioRecorder', () => {
  describe('formatDuration', () => {
    const recorder = new AudioRecorder(); // Instance to call the method

    it('should format milliseconds into HH:MM:SS format if hours > 0', () => {
      expect(recorder.formatDuration(3661000)).toBe('01:01:01'); // 1 hour, 1 minute, 1 second
    });

    it('should format milliseconds into MM:SS format if hours = 0', () => {
      expect(recorder.formatDuration(61000)).toBe('01:01'); // 1 minute, 1 second
    });

    it('should format seconds correctly', () => {
      expect(recorder.formatDuration(5000)).toBe('00:05'); // 5 seconds
    });

    it('should format minutes correctly', () => {
      expect(recorder.formatDuration(120000)).toBe('02:00'); // 2 minutes
    });

    it('should handle zero milliseconds', () => {
      expect(recorder.formatDuration(0)).toBe('00:00');
    });

    it('should handle less than a second', () => {
      expect(recorder.formatDuration(500)).toBe('00:00'); // Still 0 seconds, rounded down
    });
  });
});
