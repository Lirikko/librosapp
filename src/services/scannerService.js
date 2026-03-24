import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { MetadataService } from './metadataService';

const COMMON_DIRECTORIES = [
  'Download',
  'Documents',
  'Music',
  'Download/Libros',
  'Books',
  'Documents/Libros'
];

/**
 * ScannerService
 * Scans common local directories for books (PDF, EPUB) and audiobooks (MP3).
 */
export const ScannerService = {
  async scanStorage() {
    if (Platform.OS === 'web') return { books: [], audio: [] };
    
    const results = { books: [], audio: [] };
    // Prefix with file:// for better compatibility with Expo FileSystem on Android
    const baseDir = 'file:///storage/emulated/0/';
    
    for (const subDir of COMMON_DIRECTORIES) {
      const path = `${baseDir}${subDir}`;
      try {
        console.log(`Scanning: ${path}`);
        await this.recursiveScan(path, results);
      } catch (e) {
        console.warn(`Could not scan directory ${path}: ${e.message}`);
      }
    }
    
    return results;
  },

  async recursiveScan(path, results) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists || !info.isDirectory) return;

      const files = await FileSystem.readDirectoryAsync(path);
      
      for (const file of files) {
        // Skip hidden files
        if (file.startsWith('.')) continue;

        const fullPath = `${path}/${file}`;
        try {
          const fileInfo = await FileSystem.getInfoAsync(fullPath);

          if (fileInfo.isDirectory) {
            // Limit depth to avoid infinite loops or massive scans
            if (path.split('/').length < 10) {
                await this.recursiveScan(fullPath, results);
            }
          } else {
            const lower = file.toLowerCase();
            if (lower.endsWith('.pdf') || lower.endsWith('.epub')) {
              let book = this.formatFile(file, fullPath, false);
              book = await MetadataService.enrichBook(book);
              results.books.push(book);
            } else if (lower.endsWith('.mp3')) {
              let audio = this.formatFile(file, fullPath, true);
              audio = await MetadataService.enrichBook(audio);
              results.audio.push(audio);
            }
          }
        } catch (err) {
          // Individual file access error
        }
      }
    } catch (e) {
      // Directory access error
    }
  },

  formatFile(filename, uri, isAudio) {
    // Extract title from filename (remove extension and clean up)
    let title = filename.replace(/\.[^/.]+$/, "")
                        .replace(/_/g, " ")
                        .replace(/-/g, " ")
                        .trim();
    
    // Capitalize first letter of each word
    title = title.split(' ')
                 .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                 .join(' ');

    return {
      id: `local_${encodeURIComponent(uri)}`,
      title: title || 'Archivo Local',
      authors: [{ name: 'Dispositivo' }],
      uri: uri,
      isLocal: true,
      isAudio: isAudio,
      coverUrl: null,
      firstPublishYear: 'Local',
      subjects: [],
      source: 'local'
    };
  }
};
