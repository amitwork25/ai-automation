export interface GitSyncResult {
  action: "clone" | "pull";
  branch: string;
  commitSha: string;
  workspaceDir: string;
  syncedAt: string;
  success: boolean;
}

export interface GitWorkspaceStatus {
  ready: boolean;
  branch: string;
  workspaceDir: string;
  commitSha?: string;
  syncedAt?: string;
  lastError?: string;
}

export interface IGitService {
  sync(): Promise<GitSyncResult>;
  getStatus(): Promise<GitWorkspaceStatus>;
}
