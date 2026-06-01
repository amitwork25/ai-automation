export interface IArtifactStore {
  writeJson(runId: string, artifactName: string, data: unknown): Promise<string>;
  writeText(runId: string, artifactName: string, content: string): Promise<string>;
  readJson<T>(runId: string, artifactName: string): Promise<T>;
  listArtifacts(runId: string): Promise<string[]>;
}
