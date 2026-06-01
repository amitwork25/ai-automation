import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import type { IArtifactStore } from "../../ports/IArtifactStore.js";

export class FileArtifactStore implements IArtifactStore {
  constructor(private readonly runsDir: string) {}

  async writeJson(runId: string, artifactName: string, data: unknown): Promise<string> {
    const runDir = path.join(this.runsDir, runId);
    await mkdir(runDir, { recursive: true });
    const artifactPath = path.join(runDir, artifactName);
    await writeFile(artifactPath, JSON.stringify(data, null, 2), "utf8");
    return artifactPath;
  }

  async writeText(runId: string, artifactName: string, content: string): Promise<string> {
    const runDir = path.join(this.runsDir, runId);
    await mkdir(runDir, { recursive: true });
    const artifactPath = path.join(runDir, artifactName);
    await writeFile(artifactPath, content, "utf8");
    return artifactPath;
  }

  async readJson<T>(runId: string, artifactName: string): Promise<T> {
    const artifactPath = path.join(this.runsDir, runId, artifactName);
    const content = await readFile(artifactPath, "utf8");
    return JSON.parse(content) as T;
  }

  async listArtifacts(runId: string): Promise<string[]> {
    const runDir = path.join(this.runsDir, runId);
    try {
      return (await readdir(runDir)).sort();
    } catch {
      return [];
    }
  }
}
