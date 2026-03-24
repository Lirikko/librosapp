const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const COVER_URL_BASE = 'https://covers.openlibrary.org/b/id/';

export const MetadataService = {
  /**
   * Tries to find metadata (especially a cover) for a given filename or title.
   */
  async getMetadataForTitle(title) {
    if (!title || title.length < 3) return null;

    try {
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(cleanTitle)}&limit=1`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        const doc = data.docs[0];
        
        return {
          coverUrl: doc.cover_i ? `${COVER_URL_BASE}${doc.cover_i}-M.jpg` : null,
          author: doc.author_name ? doc.author_name[0] : 'Desconocido',
          firstPublishYear: doc.first_publish_year || 'N/A',
          subjects: doc.subject ? doc.subject.slice(0, 5) : []
        };
      }
    } catch (error) {
      console.warn('Error fetching metadata from OpenLibrary:', error.message);
    }
    return null;
  },

  /**
   * Enriches a local book object with metadata if found.
   */
  async enrichBook(book) {
    const metadata = await this.getMetadataForTitle(book.title);
    if (metadata) {
      return {
        ...book,
        coverUrl: metadata.coverUrl || book.coverUrl,
        authors: metadata.author !== 'Desconocido' ? [{ name: metadata.author }] : book.authors,
        firstPublishYear: metadata.firstPublishYear !== 'N/A' ? metadata.firstPublishYear : book.firstPublishYear,
        subjects: metadata.subjects.length > 0 ? metadata.subjects : book.subjects
      };
    }
    return book;
  }
};
