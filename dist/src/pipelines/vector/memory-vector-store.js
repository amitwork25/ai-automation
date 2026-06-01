function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9_./\s-]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 1);
}
function termFrequency(tokens) {
    const counts = new Map();
    for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    return counts;
}
function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const value of a.values()) {
        normA += value * value;
    }
    for (const value of b.values()) {
        normB += value * value;
    }
    for (const [term, weightA] of a) {
        const weightB = b.get(term);
        if (weightB !== undefined) {
            dot += weightA * weightB;
        }
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
export class MemoryVectorStore {
    documents = [];
    idf = new Map();
    index(documents) {
        this.documents = documents;
        const docCount = documents.length || 1;
        const docFrequency = new Map();
        for (const document of documents) {
            const uniqueTerms = new Set(tokenize(document.text));
            for (const term of uniqueTerms) {
                docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
            }
        }
        this.idf = new Map([...docFrequency.entries()].map(([term, df]) => [term, Math.log((docCount + 1) / (df + 1)) + 1]));
    }
    search(query, options = {}) {
        const topK = options.topK ?? 5;
        const allowed = options.collections ? new Set(options.collections) : null;
        const queryVector = this.toTfIdf(tokenize(query));
        const scored = this.documents
            .filter((document) => !allowed || allowed.has(document.collection))
            .map((document) => ({
            ...document,
            score: cosineSimilarity(queryVector, this.toTfIdf(tokenize(document.text)))
        }))
            .filter((entry) => entry.score > 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, topK);
        return scored;
    }
    toTfIdf(tokens) {
        const tf = termFrequency(tokens);
        const vector = new Map();
        for (const [term, count] of tf) {
            vector.set(term, count * (this.idf.get(term) ?? 1));
        }
        return vector;
    }
}
