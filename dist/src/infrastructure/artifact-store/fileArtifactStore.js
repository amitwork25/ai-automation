import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
export class FileArtifactStore {
    runsDir;
    constructor(runsDir) {
        this.runsDir = runsDir;
    }
    async writeJson(runId, artifactName, data) {
        const runDir = path.join(this.runsDir, runId);
        await mkdir(runDir, { recursive: true });
        const artifactPath = path.join(runDir, artifactName);
        await writeFile(artifactPath, JSON.stringify(data, null, 2), "utf8");
        return artifactPath;
    }
    async writeText(runId, artifactName, content) {
        const runDir = path.join(this.runsDir, runId);
        await mkdir(runDir, { recursive: true });
        const artifactPath = path.join(runDir, artifactName);
        await writeFile(artifactPath, content, "utf8");
        return artifactPath;
    }
    async readJson(runId, artifactName) {
        const artifactPath = path.join(this.runsDir, runId, artifactName);
        const content = await readFile(artifactPath, "utf8");
        return JSON.parse(content);
    }
    async listArtifacts(runId) {
        const runDir = path.join(this.runsDir, runId);
        try {
            return (await readdir(runDir)).sort();
        }
        catch {
            return [];
        }
    }
}
