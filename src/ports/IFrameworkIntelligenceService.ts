import type { GitSyncResult, GitWorkspaceStatus } from "./IGitService.js";

export interface IFrameworkIntelligenceService {
  initOnStartup(): Promise<void>;
  runRefresh(): Promise<GitSyncResult>;
  getStatus(): Promise<GitWorkspaceStatus>;
}
