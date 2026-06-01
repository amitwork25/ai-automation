import path from "node:path";
/** All generated TS/spec files for a run live under runs/{runId}/generated/ */
export function resolveCodegenRoot(runsDir, runId) {
    return path.join(runsDir, runId, "generated");
}
export function defaultRunsDir(projectRoot = process.cwd()) {
    return path.join(projectRoot, "runs");
}
