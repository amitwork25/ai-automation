import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
const execFile = promisify(nodeExecFile);
function withToken(gitUrl, token) {
    if (!token) {
        return gitUrl;
    }
    if (!gitUrl.startsWith("https://")) {
        return gitUrl;
    }
    const withoutProtocol = gitUrl.replace("https://", "");
    return `https://${token}@${withoutProtocol}`;
}
export class GitService {
    config;
    exec;
    lastSyncedAt;
    lastError;
    constructor(config, exec = (file, args) => execFile(file, args)) {
        this.config = config;
        this.exec = exec;
    }
    async sync() {
        try {
            const hasRepo = await this.hasGitDir();
            const action = hasRepo ? "pull" : "clone";
            if (action === "clone") {
                await this.ensureCloned();
            }
            else {
                await this.pullLatest();
            }
            const commitSha = await this.getHeadCommitSha();
            const syncedAt = new Date().toISOString();
            this.lastSyncedAt = syncedAt;
            this.lastError = undefined;
            return {
                action,
                branch: this.config.branch,
                commitSha,
                workspaceDir: this.config.workspaceDir,
                syncedAt,
                success: true
            };
        }
        catch (error) {
            this.lastError = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }
    async getStatus() {
        const hasRepo = await this.hasGitDir();
        if (!hasRepo) {
            return {
                ready: false,
                branch: this.config.branch,
                workspaceDir: this.config.workspaceDir,
                syncedAt: this.lastSyncedAt,
                lastError: this.lastError
            };
        }
        try {
            const commitSha = await this.getHeadCommitSha();
            return {
                ready: true,
                branch: this.config.branch,
                workspaceDir: this.config.workspaceDir,
                commitSha,
                syncedAt: this.lastSyncedAt,
                lastError: this.lastError
            };
        }
        catch (error) {
            return {
                ready: false,
                branch: this.config.branch,
                workspaceDir: this.config.workspaceDir,
                syncedAt: this.lastSyncedAt,
                lastError: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async ensureCloned() {
        await mkdir(path.dirname(this.config.workspaceDir), { recursive: true });
        await this.exec("git", [
            "clone",
            "--branch",
            this.config.branch,
            "--single-branch",
            withToken(this.config.gitUrl, this.config.gitToken),
            this.config.workspaceDir
        ]);
    }
    async pullLatest() {
        await this.exec("git", ["-C", this.config.workspaceDir, "fetch", "origin", this.config.branch]);
        await this.exec("git", ["-C", this.config.workspaceDir, "checkout", this.config.branch]);
        await this.exec("git", [
            "-C",
            this.config.workspaceDir,
            "reset",
            "--hard",
            `origin/${this.config.branch}`
        ]);
    }
    async hasGitDir() {
        try {
            await access(path.join(this.config.workspaceDir, ".git"));
            return true;
        }
        catch {
            return false;
        }
    }
    async getHeadCommitSha() {
        const result = await this.exec("git", ["-C", this.config.workspaceDir, "rev-parse", "--short=8", "HEAD"]);
        return result.stdout.trim();
    }
}
