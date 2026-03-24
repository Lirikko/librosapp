const { searchBooks } = require('./src/services/api');

// Mock fetch if necessary, but node-fetch usually works if installed
// Actually, let's just use the same logic as the app which expects a global fetch
// In node 18+, fetch is global.

async function test() {
    console.log("Searching for 'Cervantes'...");
    try {
        const results = await searchBooks('Cervantes');
        console.log(`Found ${results.length} results.`);
        results.slice(0, 5).forEach((b, i) => {
            console.log(`${i+1}. ${b.title} (${b.authors.map(a => a.name).join(', ')}) - Source: ${b.source}`);
        });
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
