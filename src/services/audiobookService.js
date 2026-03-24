import { Platform } from 'react-native';

const LIBRIVOX_API = 'https://librivox.org/api/feed/audiobooks/';
const ARCHIVE_AUDIO_URL = 'https://archive.org/advancedsearch.php';

const getProxyUrl = (url) => {
  if (Platform.OS === 'web') {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export const AudiobookService = {
  /**
   * Search for audiobooks in Spanish by title and author.
   */
  async searchAudiobooks(title, author) {
    const query = `${title} ${author || ''}`.trim();
    const encQuery = encodeURIComponent(query);
    
    // 1. LibriVox Search
    const lvUrl = getProxyUrl(`${LIBRIVOX_API}?format=json&title=${encodeURIComponent(title)}&extended=1`);
    
    // 2. Internet Archive Audio Search (Focused on Spanish)
    const arQuery = `(title:("${encodeURIComponent(title)}") OR description:("${encodeURIComponent(title)}")) AND mediatype:audio AND language:(spa OR spanish)`;
    const arUrl = getProxyUrl(`${ARCHIVE_AUDIO_URL}?q=${arQuery}&output=json&fl=identifier,title,creator,description&rows=5`);

    try {
      const [lvRes, arRes] = await Promise.all([
        fetch(lvUrl).catch(() => null),
        fetch(arUrl).catch(() => null)
      ]);

      const lvData = lvRes && lvRes.ok ? await lvRes.json() : { books: [] };
      const arData = arRes && arRes.ok ? await arRes.json() : { response: { docs: [] } };

      const audioResults = [];

      // Process LibriVox (Filter for Spanish if not already specific)
      if (lvData.books) {
        lvData.books.forEach(book => {
          // Check if language is Spanish (LibriVox uses 'Spanish')
          if (book.language === 'Spanish' || book.language === 'Español') {
            audioResults.push({
              id: `lv_${book.id}`,
              title: book.title,
              author: book.authors?.map(a => `${a.first_name} ${a.last_name}`).join(', '),
              url: book.url_librivox,
              zip_url: book.url_zip_file,
              source: 'LibriVox',
              type: 'audiobook'
            });
          }
        });
      }

      // Process Internet Archive
      if (arData.response?.docs) {
        arData.response.docs.forEach(doc => {
          audioResults.push({
            id: `ar_audio_${doc.identifier}`,
            title: doc.title,
            author: doc.creator,
            url: `https://archive.org/details/${doc.identifier}`,
            download_url: `https://archive.org/download/${doc.identifier}/${doc.identifier}_vbr.m3u`, // Link to playlist/files
            source: 'Internet Archive',
            type: 'audiobook',
            archiveId: doc.identifier
          });
        });
      }

      return audioResults;
    } catch (error) {
      console.error("Error searching audiobooks:", error);
      return [];
    }
  },

  /**
   * Specifically try to find a match for a given text book.
   */
  async findBestMatch(book) {
    const results = await this.searchAudiobooks(book.title, book.authors?.[0]?.name);
    if (results.length > 0) {
      // For now, return the first one as a match
      return results[0];
    }
    return null;
  }
};
