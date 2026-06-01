import { access } from "node:fs/promises";
export class FrameworkIntelligenceService {
    gitService;
    config;
    lastStatus;
    constructor(gitService, config) {
        this.gitService = gitService;
        this.config = config;
        this.lastStatus = {
            ready: false,
            branch: config.branch,
            workspaceDir: config.workspaceDir
        };
    }
    async initOnStartup() {
        if (!this.config.refreshOnStart) {
            this.lastStatus = await this.gitService.getStatus();
            return;
        }
        try {
            await this.runRefresh();
        }
        catch (error) {
            this.lastStatus = {
                ...(await this.gitService.getStatus()),
                ready: false,
                lastError: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async runRefresh() {
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
    async getStatus() {
        const gitStatus = await this.gitService.getStatus();
        return {
            ...gitStatus,
            ready: this.lastStatus.ready && gitStatus.ready,
            lastError: this.lastStatus.lastError || gitStatus.lastError
        };
    }
    async analyzeReadiness() {
        try {
            await access(this.config.workspaceDir);
            return true;
        }
        catch {
            return false;
        }
    }
}
