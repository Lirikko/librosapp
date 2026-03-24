const fetch = require('node-fetch');

async function testSearch(query) {
    const encQuery = encodeURIComponent(query);
    const urls = {
        googleAuthor: `https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encQuery}"&langRestrict=es&maxResults=5`,
        googleTitle: `https://www.googleapis.com/books/v1/volumes?q=intitle:"${encQuery}"&langRestrict=es&maxResults=5`,
        gutendex: `https://gutendex.com/books?languages=es&search=${encQuery}`,
        archive: `https://archive.org/advancedsearch.php?q=title:(${encQuery})+AND+mediatype:texts+AND+language:(spa+OR+spanish)&output=json&fl=identifier,title,creator&rows=5`
    };

    for (const [name, url] of Object.entries(urls)) {
        try {
            const res = await fetch(url);
            const data = await res.json();
            console.log(`--- ${name} ---`);
            if (name === 'gutendex') {
                console.log(`Results: ${data.results?.length || 0}`);
                if (data.results?.[0]) console.log(`Example: ${data.results[0].title}`);
            } else if (name === 'archive') {
                console.log(`Results: ${data.response?.docs?.length || 0}`);
                if (data.response?.docs?.[0]) console.log(`Example: ${data.response.docs[0].title}`);
            } else {
                console.log(`Results: ${data.items?.length || 0}`);
                if (data.items?.[0]) console.log(`Example: ${data.items[0].volumeInfo.title}`);
            }
        } catch (e) {
            console.error(`Error ${name}:`, e.message);
        }
    }
}

testSearch('Cervantes');
