import path from "node:path";
function parseBoolean(value, fallback) {
    if (!value) {
        return fallback;
    }
    return value.toLowerCase() === "true";
}
export function loadFrameworkConfig(env = process.env) {
    const gitUrl = env.FRAMEWORK_GIT_URL?.trim();
    if (!gitUrl) {
        throw new Error("FRAMEWORK_GIT_URL is required");
    }
    const branch = env.FRAMEWORK_BRANCH?.trim() || "main";
    const workspaceValue = env.FRAMEWORK_WORKSPACE_DIR?.trim() || ".framework";
    const workspaceDir = path.resolve(workspaceValue);
    const gitToken = env.FRAMEWORK_GIT_TOKEN?.trim() || undefined;
    const refreshOnStart = parseBoolean(env.FRAMEWORK_REFRESH_ON_START, false);
    return {
        gitUrl,
        branch,
        workspaceDir,
        gitToken,
        refreshOnStart
    };
}
export function loadServerConfig(env = process.env) {
    const port = Number(env.PORT ?? 3000);
    if (Number.isNaN(port) || port <= 0) {
        throw new Error("PORT must be a positive number");
    }
    return {
        port,
        host: env.HOST || "0.0.0.0"
    };
}
