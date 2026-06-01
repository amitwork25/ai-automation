export type VectorCollection = "manual_tc" | "api_contracts" | "code_steps" | "code_asserts";

export interface VectorDocument {
  id: string;
  collection: VectorCollection;
  text: string;
  metadata: Record<string, unknown>;
}

export interface ScoredVectorDocument extends VectorDocument {
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_./\s-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
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
  private documents: VectorDocument[] = [];
  private idf = new Map<string, number>();

  index(documents: VectorDocument[]): void {
    this.documents = documents;
    const docCount = documents.length || 1;
    const docFrequency = new Map<string, number>();

    for (const document of documents) {
      const uniqueTerms = new Set(tokenize(document.text));
      for (const term of uniqueTerms) {
        docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
      }
    }

    this.idf = new Map(
      [...docFrequency.entries()].map(([term, df]) => [term, Math.log((docCount + 1) / (df + 1)) + 1])
    );
  }

  search(
    query: string,
    options: { collections?: VectorCollection[]; topK?: number } = {}
  ): ScoredVectorDocument[] {
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

  private toTfIdf(tokens: string[]): Map<string, number> {
    const tf = termFrequency(tokens);
    const vector = new Map<string, number>();
    for (const [term, count] of tf) {
      vector.set(term, count * (this.idf.get(term) ?? 1));
    }
    return vector;
  }
}
