import path from "node:path";

export interface FrameworkConfig {
  gitUrl: string;
  branch: string;
  workspaceDir: string;
  gitToken?: string;
  refreshOnStart: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export function loadFrameworkConfig(env: NodeJS.ProcessEnv = process.env): FrameworkConfig {
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

export interface ServerConfig {
  port: number;
  host: string;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  return {
    port,
    host: env.HOST || "0.0.0.0"
  };
}
