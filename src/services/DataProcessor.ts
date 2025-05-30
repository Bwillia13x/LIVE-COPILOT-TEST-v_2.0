/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, StoredNote } from '../types/index.js';
import { ErrorHandler } from '../utils.js';

export class DataProcessor {
  private static readonly STORAGE_KEY = 'voiceNotesData';

  public static saveNote(note: Note): void {
    try {
      const notes = this.getAllNotes();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      const storedNote: StoredNote = {
        ...note,
        title: this.generateTitle(note.polishedNote || note.rawTranscription),
        isAutoSaved: true,
      };

      if (existingIndex >= 0) {
        notes[existingIndex] = storedNote;
      } else {
        notes.push(storedNote);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      ErrorHandler.logError('Failed to save note', error);
    }
  }

  public static getAllNotes(): StoredNote[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      ErrorHandler.logError('Failed to load notes', error);
      return [];
    }
  }

  public static deleteNote(noteId: string): boolean {
    try {
      const notes = this.getAllNotes();
      const filteredNotes = notes.filter(note => note.id !== noteId);
      
      if (filteredNotes.length !== notes.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredNotes));
        return true;
      }
      
      return false;
    } catch (error) {
      ErrorHandler.logError('Failed to delete note', error);
      return false;
    }
  }

  public static clearAllNotes(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      ErrorHandler.logError('Failed to clear notes', error);
    }
  }

  public static generateTitle(content: string): string {
    if (!content) return 'Untitled Note';
    
    // Clean and truncate content for title
    const cleaned = content
      .replace(/[^\w\s]/gi, '')
      .trim()
      .substring(0, 50);
    
    return cleaned || 'Untitled Note';
  }

  public static analyzeTranscription(text: string): {
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number;
    keyPhrases: string[];
  } {
    try {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      const wordCount = words.length;
      const characterCount = text.length;
      const estimatedReadingTime = Math.ceil(wordCount / 200); // Assuming 200 WPM reading speed

      // Simple key phrase extraction (words longer than 5 characters, appearing more than once)
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 5) {
          wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
        }
      });

      const keyPhrases = Array.from(wordFreq.entries())
        .filter(([, count]) => count > 1)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);

      return {
        wordCount,
        characterCount,
        estimatedReadingTime,
        keyPhrases,
      };
    } catch (error) {
      ErrorHandler.logError('Failed to analyze transcription', error);
      return {
        wordCount: 0,
        characterCount: 0,
        estimatedReadingTime: 0,
        keyPhrases: [],
      };
    }
  }

  public static exportNotes(format: 'markdown' | 'plain' | 'html' | 'json', includeRaw: boolean = false): string {
    try {
      const notes = this.getAllNotes();
      
      switch (format) {
        case 'markdown':
          return this.exportAsMarkdown(notes, includeRaw);
        case 'plain':
          return this.exportAsPlainText(notes, includeRaw);
        case 'html':
          return this.exportAsHTML(notes, includeRaw);
        case 'json':
          return JSON.stringify(notes, null, 2);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      ErrorHandler.logError(`Failed to export notes as ${format}`, error);
      return '';
    }
  }

  private static exportAsMarkdown(notes: StoredNote[], includeRaw: boolean): string {
    return notes.map(note => {
      const date = new Date(note.timestamp).toLocaleDateString();
      let content = `# ${note.title}\n\n**Date:** ${date}\n\n${note.polishedNote}\n\n`;
      
      if (includeRaw && note.rawTranscription !== note.polishedNote) {
        content += `## Raw Transcription\n\n${note.rawTranscription}\n\n`;
      }
      
      return content;
    }).join('---\n\n');
  }

  private static exportAsPlainText(notes: StoredNote[], includeRaw: boolean): string {
    return notes.map(note => {
      const date = new Date(note.timestamp).toLocaleDateString();
      let content = `${note.title}\nDate: ${date}\n\n${note.polishedNote}\n\n`;
      
      if (includeRaw && note.rawTranscription !== note.polishedNote) {
        content += `Raw Transcription:\n${note.rawTranscription}\n\n`;
      }
      
      return content;
    }).join('==========================================\n\n');
  }

  private static exportAsHTML(notes: StoredNote[], includeRaw: boolean): string {
    const notesHtml = notes.map(note => {
      const date = new Date(note.timestamp).toLocaleDateString();
      let content = `
        <div class="note">
          <h2>${this.escapeHtml(note.title)}</h2>
          <p><strong>Date:</strong> ${date}</p>
          <div class="content">${this.escapeHtml(note.polishedNote).replace(/\n/g, '<br>')}</div>
      `;
      
      if (includeRaw && note.rawTranscription !== note.polishedNote) {
        content += `
          <div class="raw-transcription">
            <h3>Raw Transcription</h3>
            <div class="raw-content">${this.escapeHtml(note.rawTranscription).replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }
      
      content += `</div>`;
      return content;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice Notes Export</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .note { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .note h2 { color: #333; margin-top: 0; }
        .content { margin: 15px 0; line-height: 1.6; }
        .raw-transcription { margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 4px; }
        .raw-transcription h3 { margin-top: 0; color: #666; }
    </style>
</head>
<body>
    <h1>Voice Notes Export</h1>
    ${notesHtml}
</body>
</html>
    `;
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public static searchNotes(query: string): StoredNote[] {
    try {
      const notes = this.getAllNotes();
      const lowercaseQuery = query.toLowerCase();
      
      return notes.filter(note => 
        note.title.toLowerCase().includes(lowercaseQuery) ||
        note.polishedNote.toLowerCase().includes(lowercaseQuery) ||
        note.rawTranscription.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      ErrorHandler.logError('Failed to search notes', error);
      return [];
    }
  }

  public static getNotesStats(): {
    totalNotes: number;
    totalWords: number;
    totalCharacters: number;
    averageWordsPerNote: number;
    oldestNote: Date | null;
    newestNote: Date | null;
  } {
    try {
      const notes = this.getAllNotes();
      
      if (notes.length === 0) {
        return {
          totalNotes: 0,
          totalWords: 0,
          totalCharacters: 0,
          averageWordsPerNote: 0,
          oldestNote: null,
          newestNote: null,
        };
      }

      const totalWords = notes.reduce((sum, note) => {
        const wordCount = note.polishedNote.trim().split(/\s+/).length;
        return sum + wordCount;
      }, 0);

      const totalCharacters = notes.reduce((sum, note) => sum + note.polishedNote.length, 0);
      const timestamps = notes.map(note => note.timestamp);

      return {
        totalNotes: notes.length,
        totalWords,
        totalCharacters,
        averageWordsPerNote: Math.round(totalWords / notes.length),
        oldestNote: new Date(Math.min(...timestamps)),
        newestNote: new Date(Math.max(...timestamps)),
      };
    } catch (error) {
      ErrorHandler.logError('Failed to get notes stats', error);
      return {
        totalNotes: 0,
        totalWords: 0,
        totalCharacters: 0,
        averageWordsPerNote: 0,
        oldestNote: null,
        newestNote: null,
      };
    }
  }
}
