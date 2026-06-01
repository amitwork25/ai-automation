import { access } from "node:fs/promises";

import type { FrameworkConfig } from "../../config/framework.config.js";
import type { IFrameworkIntelligenceService } from "../../ports/IFrameworkIntelligenceService.js";
import type { IGitService, GitSyncResult, GitWorkspaceStatus } from "../../ports/IGitService.js";

export class FrameworkIntelligenceService implements IFrameworkIntelligenceService {
  private lastStatus: GitWorkspaceStatus;

  constructor(
    private readonly gitService: IGitService,
    private readonly config: FrameworkConfig
  ) {
    this.lastStatus = {
      ready: false,
      branch: config.branch,
      workspaceDir: config.workspaceDir
    };
  }

  async initOnStartup(): Promise<void> {
    if (!this.config.refreshOnStart) {
      this.lastStatus = await this.gitService.getStatus();
      return;
    }

    try {
      await this.runRefresh();
    } catch (error) {
      this.lastStatus = {
        ...(await this.gitService.getStatus()),
        ready: false,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runRefresh(): Promise<GitSyncResult> {
    const syncResult = await this.gitService.sync();
    const ready = await this.analyzeReadiness();
    this.lastStatus = {
      ready,
      branch: syncResult.branch,
      workspaceDir: syncResult.workspaceDir,
      commitSha: syncResult.commitSha,
      syncedAt: syncResult.syncedAt
    };

    return syncResult;
  }

  async getStatus(): Promise<GitWorkspaceStatus> {
    const gitStatus = await this.gitService.getStatus();
    return {
      ...gitStatus,
      ready: this.lastStatus.ready && gitStatus.ready,
      lastError: this.lastStatus.lastError || gitStatus.lastError
    };
  }

  private async analyzeReadiness(): Promise<boolean> {
    try {
      await access(this.config.workspaceDir);
      return true;
    } catch {
      return false;
    }
  }
}
