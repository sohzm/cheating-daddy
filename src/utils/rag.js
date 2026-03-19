const fs = require('fs');
const path = require('path');
let pdfParse = null;

try {
    pdfParse = require('pdf-parse');
} catch (e) {
    console.warn('pdf-parse not installed yet.');
}

// In-memory vector store
// Array of { text: string, embedding: number[], file: string }
let vectorStore = [];
let embedder = null;
let isIndexing = false;
const storage = require('../storage');

// ── Initialize Embedder ──
async function initEmbedder() {
    if (embedder) return embedder;
    try {
        const { pipeline, env } = await import('@huggingface/transformers');
        const { app } = require('electron');
        env.cacheDir = path.join(app.getPath('userData'), 'embeddings-models');
        
        console.log('[RAG] Loading embedding model...');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            dtype: 'q8',
            device: 'auto'
        });
        console.log('[RAG] Embedding model loaded successfully.');
        return embedder;
    } catch (error) {
        console.error('[RAG] Error loading embedder:', error);
        return null;
    }
}

// ── NVIDIA Embeddings API ──
async function getNvidiaEmbeddings(textArray, apiKey) {
    const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: textArray,
            model: "nvidia/nv-embedqa-e5-v5",
            input_type: "query",
            encoding_format: "float",
            truncate: "END"
        })
    });
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`NVIDIA API Error ${response.status}: ${err}`);
    }
    
    const data = await response.json();
    return data.data.map(d => d.embedding);
}

// ── Extract Text ──
async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Ignore heavy files
    try {
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 5 * 1024 * 1024) return ''; // ignore > 5MB
    } catch (e) { return ''; }

    try {
        if (ext === '.pdf' && pdfParse) {
            const dataBuffer = await fs.promises.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (['.txt', '.md', '.csv', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.py'].includes(ext)) {
            return await fs.promises.readFile(filePath, 'utf8');
        }
    } catch (error) {
        console.warn(`[RAG] Error reading file ${filePath}:`, error.message);
    }
    return '';
}

// ── Chunk Text ──
function chunkText(text, maxWords = 150) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = [];
    
    for (const word of words) {
        currentChunk.push(word);
        if (currentChunk.length >= maxWords) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }
    return chunks;
}

// ── Index Folder ──
async function indexFolder(folderPath) {
    if (isIndexing) return false;
    isIndexing = true;
    
    try {
        if (!fs.existsSync(folderPath)) {
            isIndexing = false;
            return false;
        }

        const nvidiaApiKey = storage.getNvidiaApiKey();
        const useNvidia = !!nvidiaApiKey;

        if (!useNvidia) {
            await initEmbedder();
            if (!embedder) {
                isIndexing = false;
                return false;
            }
        }

        vectorStore = []; // Reset store
        
        // Async Recursive folder read
        async function getFiles(dir, maxDepth = 15, currentDepth = 0) {
            let results = [];
            if (currentDepth > maxDepth) return results;

            // Yield to event loop occasionally to prevent UI freeze
            await new Promise(resolve => setTimeout(resolve, 0));

            try {
                const list = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const dirent of list) {
                    const fullPath = path.join(dir, dirent.name);
                    
                    if (dirent.isDirectory()) {
                        const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '.gemini', '.vscode', '.idea'];
                        if (!skipDirs.includes(dirent.name) && !dirent.name.startsWith('.')) {
                            const subFiles = await getFiles(fullPath, maxDepth, currentDepth + 1);
                            results = results.concat(subFiles);
                        }
                    } else {
                        const ext = path.extname(fullPath).toLowerCase();
                        if (['.pdf', '.txt', '.md', '.csv', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.py'].includes(ext)) {
                            results.push(fullPath);
                        }
                    }
                }
            } catch (e) {
                console.warn('[RAG] Skip dir read:', e.message);
            }
            return results;
        }

        const files = await getFiles(folderPath);
        console.log(`[RAG] Found ${files.length} files to index.`);
        
        let allChunks = [];
        for (const file of files) {
            const text = await extractText(file);
            if (text && text.trim().length > 0) {
                const chunks = chunkText(text);
                for (const chunk of chunks) {
                    allChunks.push({ text: chunk, file: path.basename(file) });
                }
            }
        }
        
        if (useNvidia) {
            console.log(`[RAG] Getting embeddings from NVIDIA API for ${allChunks.length} chunks...`);
            // Batch them in chunks of 50 to avoid payload size limit
            for (let i = 0; i < allChunks.length; i += 50) {
                const batch = allChunks.slice(i, i + 50);
                const texts = batch.map(b => b.text);
                const embeddings = await getNvidiaEmbeddings(texts, nvidiaApiKey);
                for (let j = 0; j < batch.length; j++) {
                    vectorStore.push({
                        text: batch[j].text,
                        file: batch[j].file,
                        embedding: embeddings[j]
                    });
                }
            }
        } else {
            console.log(`[RAG] Getting embeddings from Local Huggingface pipeline...`);
            for (const item of allChunks) {
                const output = await embedder(item.text, { pooling: 'mean', normalize: true });
                vectorStore.push({
                    text: item.text,
                    file: item.file,
                    embedding: Array.from(output.data)
                });
            }
        }
        
        console.log(`[RAG] Indexed ${vectorStore.length} chunks from ${folderPath}`);
        isIndexing = false;
        return true;
    } catch (err) {
        console.error('[RAG] Indexing error:', err);
        isIndexing = false;
        return false;
    }
}

// ── Cosine Similarity ──
function cosineSimilarity(A, B) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < A.length; i++) {
        dotProduct += (A[i] * B[i]);
        normA += (A[i] * A[i]);
        normB += (B[i] * B[i]);
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Search ──
async function searchContext(query, topK = 3) {
    if (vectorStore.length === 0) return '';
    
    try {
        const nvidiaApiKey = storage.getNvidiaApiKey();
        let queryEmbedding;
        
        if (nvidiaApiKey) {
            const embeddings = await getNvidiaEmbeddings([query], nvidiaApiKey);
            queryEmbedding = embeddings[0];
        } else {
            await initEmbedder();
            if (!embedder) return '';
            const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
            queryEmbedding = Array.from(queryOutput.data);
        }
        
        const scoredChunks = vectorStore.map(chunk => ({
            ...chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        scoredChunks.sort((a, b) => b.score - a.score);
        
        const topResults = scoredChunks.slice(0, topK);
        // Only return reasonably relevant chunks (skip very low similarity)
        const relevantResults = topResults.filter(r => r.score > 0.05); // Dropped extremely low threshold
        
        console.log(`[RAG] Found ${relevantResults.length} relevant chunks for query.`);
        if (relevantResults.length > 0) {
            console.log(`[RAG] Top score: ${relevantResults[0].score}`);
        }

        if (relevantResults.length === 0) return '';
        
        return relevantResults.map((r, i) => `[From file: ${r.file}]:\n${r.text}`).join('\n\n');
    } catch (err) {
        console.error('[RAG] Search error:', err);
        return '';
    }
}

module.exports = {
    indexFolder,
    searchContext,
    isReady: () => vectorStore.length > 0
};
