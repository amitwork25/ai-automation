import type {
  ManualTestCasesArtifact,
  VectorIndexReportArtifact,
  VectorRetrievalContextArtifact
} from "../../contracts/pipeline.js";
import { MemoryVectorStore } from "./memory-vector-store.js";

export function step3bVectorRetrieve(input: {
  productId: string;
  manualCases: ManualTestCasesArtifact;
  indexReport: VectorIndexReportArtifact;
  topK?: number;
}): VectorRetrievalContextArtifact {
  const store = new MemoryVectorStore();
  store.index(input.indexReport.documents);

  const queries = input.manualCases.cases.flatMap((testCase) =>
    testCase.expectedResults.map((expectedText, index) => ({
      queryId: `${testCase.caseId}:${index + 1}`,
      caseId: testCase.caseId,
      manualStepIndex: index + 1,
      queryText: expectedText
    }))
  );

  const topK = input.topK ?? 4;
  const results = queries.map((query) => ({
    ...query,
    hits: store
      .search(query.queryText, { topK })
      .map((hit) => ({
        documentId: hit.id,
        collection: hit.collection,
        score: Number(hit.score.toFixed(4)),
        text: hit.text.slice(0, 400),
        metadata: hit.metadata
      }))
  }));

  return {
    schemaVersion: "03b-retrieval-context-v1",
    productId: input.productId,
    manualTcHash: input.manualCases.manualTcHash,
    topK,
    results,
    summary: {
      queryCount: results.length,
      hitCount: results.reduce((total, entry) => total + entry.hits.length, 0)
    }
  };
}
