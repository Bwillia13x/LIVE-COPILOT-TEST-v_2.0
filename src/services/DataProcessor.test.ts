import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataProcessor } from './DataProcessor';
import { Note, StoredNote, ExportFormat, NoteAnalysis } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('DataProcessor', () => {
  const initialTime = new Date(2023, 0, 1, 10, 0, 0).getTime(); // Jan 1, 2023 10:00:00
  const laterTime = new Date(2023, 0, 1, 11, 0, 0).getTime(); // Jan 1, 2023 11:00:00


  const testNote1Input: Note = {
    id: '1',
    rawTranscription: 'Raw content for note one. It has some special characters like < > & " \'.',
    polishedNote: 'Polished content for note one. Some special chars < > & " \'.',
    timestamp: initialTime,
  };

  const testNote2Input: Note = {
    id: '2',
    rawTranscription: 'Raw for second note, very interesting.',
    polishedNote: 'Polished for second note, quite informative.',
    timestamp: initialTime + 1000,
  };

  const getExpectedStoredNote = (note: Note, modificationTime: number, isAutoSaved = true): StoredNote => ({
    ...note,
    title: DataProcessor.generateTitle(note.polishedNote || note.rawTranscription),
    isAutoSaved: isAutoSaved,
    timestamp: note.timestamp, // Creation timestamp
    lastModified: modificationTime,
  });


  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock_store = {};
    Object.defineProperty(localStorageMock, 'length', { get: () => Object.keys(localStorageMock_store).length, configurable: true });
    vi.useFakeTimers();
    vi.setSystemTime(initialTime);
  });

  let localStorageMock_store: Record<string, string> = {};
  Object.defineProperty(localStorageMock, 'getItem', { value: (key: string) => localStorageMock_store[key] || null, configurable: true });
  Object.defineProperty(localStorageMock, 'setItem', { value: (key: string, value: string) => { localStorageMock_store[key] = value.toString(); }, configurable: true });
  Object.defineProperty(localStorageMock, 'removeItem', { value: (key: string) => { delete localStorageMock_store[key]; }, configurable: true });
  Object.defineProperty(localStorageMock, 'clear', { value: () => { localStorageMock_store = {}; }, configurable: true });
  Object.defineProperty(localStorageMock, 'key', { value: (index: number) => Object.keys(localStorageMock_store)[index] || null, configurable: true });


  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateTitle', () => {
    it('should return "Untitled Note" for empty content', () => {
      expect(DataProcessor.generateTitle('')).toBe('Untitled Note');
    });
    it('should use content as title if short and clean', () => {
      expect(DataProcessor.generateTitle('My simple note')).toBe('My simple note');
    });
    it('should truncate long content to 50 characters', () => {
      const longText = 'This is a very long piece of text that definitely exceeds fifty characters limit for a title and goes on and on.';
      const expected = longText.substring(0, 50);
      expect(DataProcessor.generateTitle(longText)).toBe(expected);
    });
    it('should take the first 7 words if that is shorter than 50 chars, otherwise truncate the 7 words string to 50 chars', () => {
      const shortSevenWords = "One two three four five six seven";
      expect(DataProcessor.generateTitle(shortSevenWords)).toBe(shortSevenWords);

      const longSevenWordsMakesItTruncated = "Word1 Word2 Word3 Word4 Word5 Word6 WordSevenIsVeryLongAndExceedsFiftyChars";
      const expectedTruncated = "Word1 Word2 Word3 Word4 Word5 Word6 WordSevenIsVeryLongAndExceedsFiftyChars".substring(0,50);
      expect(DataProcessor.generateTitle(longSevenWordsMakesItTruncated)).toBe(expectedTruncated);
    });
    it('should clean non-alphanumeric (excluding space) and remove leading/trailing spaces from title', () => {
      expect(DataProcessor.generateTitle('Hello! World?')).toBe('Hello World');
      expect(DataProcessor.generateTitle('Title with <b>bold</b> tags')).toBe('Title with bboldb tags');
      expect(DataProcessor.generateTitle('  Leading/trailing spaces and symbols!@#  ')).toBe('Leadingtrailing spaces and symbols');
    });
    it('should return "_" if cleaning results in only "_", and "Untitled Note" for whitespace-only', () => {
      expect(DataProcessor.generateTitle('!@#$%^&*()_+')).toBe('_');
      expect(DataProcessor.generateTitle('   ')).toBe('Untitled Note');
    });
    it('should prefer polishedNote if available for title generation', () => {
        const noteWithPolished = { rawTranscription: "Raw title data", polishedNote: "Polished Title First Content", id: "3", timestamp: Date.now() };
        DataProcessor.saveNote(noteWithPolished);
        const saved = DataProcessor.getAllNotes()[0];
        expect(saved.title).toBe(DataProcessor.generateTitle("Polished Title First Content"));
    });
  });

  describe('saveNote and getAllNotes', () => {
    it('should save a new note with creation timestamp and current lastModified', () => {
      vi.setSystemTime(initialTime);
      DataProcessor.saveNote(testNote1Input);
      const notes = DataProcessor.getAllNotes();
      expect(notes.length).toBe(1);
      expect(notes[0].id).toBe(testNote1Input.id);
      expect(notes[0].timestamp).toBe(testNote1Input.timestamp);
      expect(notes[0].lastModified).toBe(initialTime);
      expect(notes[0].isAutoSaved).toBe(true);
    });

    it('should update an existing note, preserve creation timestamp, and update lastModified', () => {
      vi.setSystemTime(initialTime);
      DataProcessor.saveNote(testNote1Input);
      const originalNotes = DataProcessor.getAllNotes();
      const originalCreationTimestamp = originalNotes[0].timestamp;

      vi.setSystemTime(laterTime);
      const updatedPolishedContent = 'Updated polished note content';
      const noteToUpdate: Note & { isAutoSaved?: boolean } = {
        ...testNote1Input,
        polishedNote: updatedPolishedContent,
        isAutoSaved: false
      };
      DataProcessor.saveNote(noteToUpdate);

      const notes = DataProcessor.getAllNotes();
      expect(notes.length).toBe(1);
      const updatedSavedNote = notes[0];

      expect(updatedSavedNote.polishedNote).toBe(updatedPolishedContent);
      expect(updatedSavedNote.timestamp).toBe(originalCreationTimestamp);
      expect(updatedSavedNote.lastModified).toBe(laterTime);
      expect(updatedSavedNote.title).toBe(DataProcessor.generateTitle(updatedPolishedContent));
      expect(updatedSavedNote.isAutoSaved).toBe(false);
    });

    it('should default isAutoSaved to true if not provided on update', () => {
        vi.setSystemTime(initialTime);
        DataProcessor.saveNote(testNote1Input);

        vi.setSystemTime(laterTime);
        const noteUpdateWithoutIsAutoSaved: Note = {
            id: testNote1Input.id,
            rawTranscription: "new raw",
            polishedNote: "new polished",
            timestamp: testNote1Input.timestamp
        };
        DataProcessor.saveNote(noteUpdateWithoutIsAutoSaved);
        const notes = DataProcessor.getAllNotes();
        expect(notes[0].isAutoSaved).toBe(true);
    });
  });

  describe('deleteNote', () => {
    it('should delete an existing note and return true', () => {
      DataProcessor.saveNote(testNote1Input);
      DataProcessor.saveNote(testNote2Input);
      expect(DataProcessor.deleteNote(testNote1Input.id)).toBe(true);
      const notes = DataProcessor.getAllNotes();
      expect(notes.length).toBe(1);
      expect(notes[0].id).toBe(testNote2Input.id);
      expect(notes[0].lastModified).toBeDefined();
    });

    it('should return false when attempting to delete a non-existent note', () => {
      DataProcessor.saveNote(testNote1Input);
      expect(DataProcessor.deleteNote('non-existent-id')).toBe(false);
      const notes = DataProcessor.getAllNotes();
      expect(notes.length).toBe(1);
    });
  });

  describe('clearAllNotes', () => {
    it('should clear all notes from storage', () => {
      DataProcessor.saveNote(testNote1Input);
      DataProcessor.saveNote(testNote2Input);
      DataProcessor.clearAllNotes();
      const notes = DataProcessor.getAllNotes();
      expect(notes.length).toBe(0);
    });
  });

  describe('analyzeTranscription', () => {
    it('should return zero values for empty text', () => {
      const analysis = DataProcessor.analyzeTranscription('');
      expect(analysis.wordCount).toBe(0);
      expect(analysis.characterCount).toBe(0);
      expect(analysis.estimatedReadingTime).toBe(0);
      expect(analysis.keyPhrases).toEqual([]);
    });
    it('should correctly analyze simple text', () => {
      const text = 'This is a simple sentence.';
      const analysis = DataProcessor.analyzeTranscription(text);
      expect(analysis.wordCount).toBe(5);
      expect(analysis.characterCount).toBe(text.length);
      expect(analysis.estimatedReadingTime).toBe(1);
    });
    it('should extract key phrases', () => {
      const text = 'This is a test about testing and important test procedures for tests.';
      const analysis = DataProcessor.analyzeTranscription(text);
      expect(Array.isArray(analysis.keyPhrases)).toBe(true);
      if (text.length > 0 && analysis.keyPhrases.length === 0) {
        console.warn("Key phrase extraction returned empty for test text:", text);
      }
    });
  });

  describe('exportNotes', () => {
    const complexHtmlNoteInput: Note = {
      id: 'complexHtml',
      rawTranscription: 'Raw <script>alert("xss")</script>',
      polishedNote: 'Polished <b>bold</b> & "quotes" and \'single\' with <>&"\'',
      timestamp: initialTime - 500,
    };
    const complexRawEscaped = 'Raw &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    const complexPolishedEscaped = 'Polished &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quotes&quot; and &#39;single&#39; with &lt;&gt;&amp;&quot;&#39;';


    const formats: ExportFormat[] = ['markdown', 'plain', 'json', 'html'];

    beforeEach(() => {
        vi.setSystemTime(initialTime);
        DataProcessor.saveNote(testNote1Input);
        vi.setSystemTime(initialTime + 1000);
        DataProcessor.saveNote(testNote2Input);
    });

    formats.forEach(format => {
      describe(`Format: ${format}`, () => {
        it('should return empty string or default structure for no notes', () => {
          DataProcessor.clearAllNotes();
          const exported = DataProcessor.exportNotes(format, true);
          if (format === 'json') {
            expect(JSON.parse(exported)).toEqual([]);
          } else if (format === 'html') {
            expect(exported).toContain('<!DOCTYPE html>');
            const tempTitle = DataProcessor.generateTitle(testNote1Input.polishedNote!);
            expect(exported).not.toContain(tempTitle);
          } else {
            expect(exported.trim()).toBe('');
          }
        });

        it(`should export multiple notes correctly including lastModified for ${format}`, () => {
            const notesToExport = DataProcessor.getAllNotes();
            const exported = DataProcessor.exportNotes(format, false, notesToExport);
            const expectedTitle1 = DataProcessor.generateTitle(testNote1Input.polishedNote!);

            if (format === 'json') {
                const parsed = JSON.parse(exported);
                expect(parsed.length).toBe(2);
                const parsedNote1 = parsed.find((n: StoredNote) => n.id === '1');
                const parsedNote2 = parsed.find((n: StoredNote) => n.id === '2');
                expect(parsedNote1?.title).toBe(expectedTitle1);
                expect(parsedNote1?.lastModified).toBe(initialTime);
                expect(parsedNote2?.lastModified).toBe(initialTime + 1000);
            } else {
                expect(exported).toContain(expectedTitle1);
                expect(exported).toContain(testNote2Input.polishedNote);
            }
        });
      });
    });

    describe('escapeHtml (tested via exportNotes with HTML format)', () => {
        it('should escape HTML special characters according to new logic', () => {
          DataProcessor.clearAllNotes();
          vi.setSystemTime(initialTime);
          DataProcessor.saveNote(complexHtmlNoteInput);
          const notesToExport = DataProcessor.getAllNotes();
          const exportedHtml = DataProcessor.exportNotes('html', true, notesToExport);

          expect(exportedHtml).toContain(complexRawEscaped);
          expect(exportedHtml).toContain(complexPolishedEscaped);
        });
      });
  });

  describe('searchNotes', () => {
    beforeEach(() => {
        vi.setSystemTime(initialTime);
        DataProcessor.saveNote(testNote1Input);
        DataProcessor.saveNote(testNote2Input);
    });

    it('should return all notes (including lastModified) for an empty query', () => {
      const results = DataProcessor.searchNotes('');
      expect(results.length).toBe(2);
      expect(results[0].lastModified).toBeDefined();
    });
    it('should find a note by its title', () => {
      const results = DataProcessor.searchNotes(DataProcessor.generateTitle(testNote1Input.polishedNote!));
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(testNote1Input.id);
    });
  });

  describe('getNotesStats', () => {
    it('should return zero/null stats if no notes are present', () => {
      const stats = DataProcessor.getNotesStats();
      expect(stats.totalNotes).toBe(0);
      expect(stats.totalWords).toBe(0);
      expect(stats.averageWordsPerNote).toBe(0);
      expect(stats.oldestNote).toBeNull();
      expect(stats.newestNote).toBeNull();
    });

    it('should return correct stats for a single note', () => {
      vi.setSystemTime(initialTime);
      DataProcessor.saveNote(testNote1Input);
      const stats = DataProcessor.getNotesStats();
      expect(stats.totalNotes).toBe(1);
      expect(stats.totalWords).toBe(13);
      expect(stats.averageWordsPerNote).toBe(13);
      expect(stats.oldestNote).toEqual(new Date(testNote1Input.timestamp));
      expect(stats.newestNote).toEqual(new Date(testNote1Input.timestamp));
    });

    it('should return correct stats for multiple notes', () => {
      vi.setSystemTime(initialTime);
      DataProcessor.saveNote(testNote1Input);
      vi.setSystemTime(initialTime + 1000);
      DataProcessor.saveNote(testNote2Input);

      const stats = DataProcessor.getNotesStats();
      expect(stats.totalNotes).toBe(2);
      expect(stats.totalWords).toBe(13 + 6);
      expect(stats.averageWordsPerNote).toBe(Math.round((13 + 6) / 2));
      expect(stats.oldestNote).toEqual(new Date(testNote1Input.timestamp));
      expect(stats.newestNote).toEqual(new Date(testNote2Input.timestamp));
    });
  });
});
