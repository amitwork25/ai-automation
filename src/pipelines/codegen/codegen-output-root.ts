import path from "node:path";

/** All generated TS/spec files for a run live under runs/{runId}/generated/ */
export function resolveCodegenRoot(runsDir: string, runId: string): string {
  return path.join(runsDir, runId, "generated");
}

export function defaultRunsDir(projectRoot = process.cwd()): string {
  return path.join(projectRoot, "runs");
}
