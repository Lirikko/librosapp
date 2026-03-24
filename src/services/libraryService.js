import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const LIBRARY_KEY = '@book_library';

export const LibraryService = {
  // Get all books in the library
  async getLibrary() {
    try {
      const jsonValue = await AsyncStorage.getItem(LIBRARY_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error fetching library:', e);
      return [];
    }
  },

  // Add a book to the library
  async addBook(book, localUri) {
    try {
      const library = await this.getLibrary();
      
      // Check if book already exists by ID, title or URI
      const exists = library.find(b => 
        b.id === book.id || 
        b.title === book.title || 
        (book.uri && b.localUri === book.uri)
      );

      if (exists) {
        // Update existing book if the local file exists but metadata changed
        const updatedLibrary = library.map(b => 
          (b.id === exists.id) ? { ...b, ...book, localUri: localUri || book.uri || b.localUri, dateAdded: b.dateAdded || new Date().toISOString() } : b
        );
        await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
        return;
      }

      const newBook = {
        ...book,
        localUri,
        dateAdded: new Date().toISOString(),
        id: book.id || `local_${Date.now()}`
      };

      const updatedLibrary = [newBook, ...library];
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
    } catch (e) {
      console.error('Error adding book to library:', e);
    }
  },

  // Remove a book from the library and delete the local file
  async removeBook(bookId) {
    try {
      const library = await this.getLibrary();
      const bookToRemove = library.find(b => b.id === bookId);
      
      if (bookToRemove && bookToRemove.localUri) {
        const fileInfo = await FileSystem.getInfoAsync(bookToRemove.localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(bookToRemove.localUri);
        }
      }

      const updatedLibrary = library.filter(b => b.id !== bookId);
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
    } catch (e) {
      console.error('Error removing book from library:', e);
    }
  },

  // Scan document directory for orphans (optional feature)
  async syncFileSystem() {
    // This could be implemented to find files that are not in the library metadata
  }
};
