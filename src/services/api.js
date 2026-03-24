export const searchBooks = async (query, authorFilter = null) => {
  // Limpieza de semántica
  let cleanStr = query.toLowerCase()
    .replace(/\b(saga|libro|trilogia|coleccion|serie|volumen|parte|de)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');
    
  if (!cleanStr) cleanStr = query; 

  const encQuery = encodeURIComponent(query);
  const encClean = encodeURIComponent(cleanStr);
  const authorAppend = authorFilter ? `+inauthor:"${encodeURIComponent(authorFilter)}"` : '';
  
  // 1. Coincidencia de Autor
  const authorUrl = `https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encClean}"${authorAppend}&langRestrict=es&maxResults=10`;
  // 2. Coincidencia exacta de Título (Frase exacta)
  const titleExactUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:"${encClean}"${authorAppend}&langRestrict=es&maxResults=10`;
  // 3. Coincidencia amplia de Título
  const titleBroadUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encClean}${authorAppend}&langRestrict=es&maxResults=15`;
  // 4. Búsqueda semántica general
  const fallbackUrl = `https://www.googleapis.com/books/v1/volumes?q=${encQuery}${authorAppend}&langRestrict=es&maxResults=10`;
  
  // 5. Gutendex
  const guUrl = `https://gutendex.com/books?languages=es&search=${encQuery}`;
  
  // 6. Internet Archive (Nuevo origen legal mundial)
  const archiveUrl = `https://archive.org/advancedsearch.php?q=title:(${encClean})+AND+mediatype:texts+AND+language:(spa+OR+spanish)&output=json&fl=identifier,title,creator&rows=15`;

  try {
    const [authorRes, titleExactRes, titleBroadRes, fallbackRes, guRes, arRes] = await Promise.all([
      fetch(authorUrl),
      fetch(titleExactUrl),
      fetch(titleBroadUrl),
      fetch(fallbackUrl),
      fetch(guUrl),
      fetch(archiveUrl)
    ].map(p => p.catch(() => ({ ok: false })))); 
    
    // Procesamiento
    const processRes = async (res) => (res && res.ok) ? await res.json() : { items: [] };

    const authorData = await processRes(authorRes);
    const titleExactData = await processRes(titleExactRes);
    const titleBroadData = await processRes(titleBroadRes);
    const fallbackData = await processRes(fallbackRes);
    
    let guData = { results: [] };
    if (guRes && guRes.ok) guData = await guRes.json();

    let arData = { response: { docs: [] } };
    if (arRes && arRes.ok) arData = await arRes.json();

    // Fusión y De-duplicación
    const finalBooks = [];
    const seenTitles = new Set();

    // 1. Procesar Google Books
    if (authorData.items) authorData.items.forEach(item => addGoogleBook(item));
    if (titleExactData.items) titleExactData.items.forEach(item => addGoogleBook(item));
    if (titleBroadData.items) titleBroadData.items.forEach(item => addGoogleBook(item));
    if (fallbackData.items) fallbackData.items.forEach(item => addGoogleBook(item));

    function addGoogleBook(item) {
      if (!item || !item.volumeInfo) return;
      const title = item.volumeInfo.title || 'Desconocido';
      const normalizedTitle = normalize(title);
      if (seenTitles.has(normalizedTitle)) return;
      
      const info = item.volumeInfo;
      const inGutendex = guData.results?.find(b => normalize(b.title).includes(normalizedTitle) || normalizedTitle.includes(normalize(b.title)));
      const inArchive = arData.response?.docs?.find(b => normalize(b.title || '').includes(normalizedTitle) || normalizedTitle.includes(normalize(b.title || '')));
      
      const googleDownloadable = item.accessInfo && item.accessInfo.publicDomain && 
        (item.accessInfo.epub?.isAvailable || item.accessInfo.pdf?.isAvailable);

      finalBooks.push({
        id: item.id,
        title: title,
        authors: info.authors ? info.authors.map(name => ({ name })) : [],
        description: info.description || null,
        isDownloadable: !!inGutendex || googleDownloadable || !!inArchive,
        gutendexBook: inGutendex || null,
        accessInfo: item.accessInfo || null,
        archiveId: inArchive ? inArchive.identifier : null,
        previewLink: info.previewLink || info.infoLink || null,
        coverUrl: getGoogleCover(info),
        subjects: info.categories || [],
        firstPublishYear: info.publishedDate ? info.publishedDate.substring(0, 4) : 'Desconocido',
        source: 'google'
      });
      seenTitles.add(normalizedTitle);
    }

    // 2. Procesar Gutendex (Libros que NO están en Google Books)
    if (guData.results) {
      guData.results.forEach(book => {
        const normalizedTitle = normalize(book.title);
        if (seenTitles.has(normalizedTitle)) return;

        finalBooks.push({
          id: `gu_${book.id}`,
          title: book.title,
          authors: book.authors.map(a => ({ name: a.name })),
          description: null,
          isDownloadable: true,
          gutendexBook: book,
          accessInfo: null,
          archiveId: null,
          previewLink: null,
          coverUrl: null, // Gutendex no suele dar portadas directas fáciles
          subjects: book.subjects || [],
          firstPublishYear: 'Desconocido',
          source: 'gutendex'
        });
        seenTitles.add(normalizedTitle);
      });
    }

    // 3. Procesar Internet Archive
    if (arData.response && arData.response.docs) {
      arData.response.docs.forEach(doc => {
        const normalizedTitle = normalize(doc.title || '');
        if (seenTitles.has(normalizedTitle)) return;

        finalBooks.push({
          id: `ar_${doc.identifier}`,
          title: doc.title || 'Desconocido',
          authors: doc.creator ? [{ name: doc.creator }] : [],
          description: null,
          isDownloadable: true,
          gutendexBook: null,
          accessInfo: null,
          archiveId: doc.identifier,
          previewLink: `https://archive.org/details/${doc.identifier}`,
          coverUrl: `https://archive.org/services/img/${doc.identifier}`,
          subjects: [],
          firstPublishYear: 'Desconocido',
          source: 'archive'
        });
        seenTitles.add(normalizedTitle);
      });
    }

    return finalBooks;

  } catch (error) {
    return [];
  }
};

function normalize(str) {
  return str ? str.toLowerCase().trim() : '';
}

function getGoogleCover(info) {
  if (info.imageLinks && info.imageLinks.thumbnail) {
    return info.imageLinks.thumbnail.replace('http:', 'https:').replace('&zoom=1', '&zoom=2');
  } else if (info.industryIdentifiers) {
    const isbn = info.industryIdentifiers.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10');
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn.identifier}-M.jpg`;
  }
  return null;
}
