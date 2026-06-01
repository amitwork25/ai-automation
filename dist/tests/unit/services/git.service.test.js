import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { GitService } from "../../../src/services/git/git.service.js";
const execFile = promisify(nodeExecFile);
async function runGit(args) {
    const result = await execFile("git", args);
    return result.stdout.trim();
}
async function createSeededRemote(baseDir) {
    const originDir = path.join(baseDir, "origin.git");
    const seedDir = path.join(baseDir, "seed");
    await mkdir(seedDir, { recursive: true });
    await runGit(["init", "--bare", originDir]);
    await runGit(["init", "-b", "main", seedDir]);
    await runGit(["-C", seedDir, "config", "user.name", "Automation Agent"]);
    await runGit(["-C", seedDir, "config", "user.email", "automation@example.com"]);
    await writeFile(path.join(seedDir, "README.md"), "v1\n", "utf8");
    await runGit(["-C", seedDir, "add", "."]);
    await runGit(["-C", seedDir, "commit", "-m", "initial commit"]);
    await runGit(["-C", seedDir, "remote", "add", "origin", originDir]);
    await runGit(["-C", seedDir, "push", "-u", "origin", "main"]);
    return { originDir, seedDir };
}
function makeConfig(originDir, workspaceDir) {
    return {
        gitUrl: originDir,
        branch: "main",
        workspaceDir,
        refreshOnStart: false
    };
}
const tempDirs = [];
afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
describe("GitService", () => {
    it("clones repository on clean workspace", async () => {
        const testDir = await mkdtemp(path.join(os.tmpdir(), "git-service-clean-"));
        tempDirs.push(testDir);
        const { originDir } = await createSeededRemote(testDir);
        const workspaceDir = path.join(testDir, "workspace");
        const service = new GitService(makeConfig(originDir, workspaceDir));
        const result = await service.sync();
        const originHead = await runGit(["-C", originDir, "rev-parse", "--short=8", "main"]);
        const status = await service.getStatus();
        expect(result.action).toBe("clone");
        expect(result.commitSha).toBe(originHead);
        expect(status.ready).toBe(true);
        expect(status.commitSha).toBe(originHead);
    });
    it("pulls latest and hard resets existing workspace", async () => {
        const testDir = await mkdtemp(path.join(os.tmpdir(), "git-service-pull-"));
        tempDirs.push(testDir);
        const { originDir, seedDir } = await createSeededRemote(testDir);
        const workspaceDir = path.join(testDir, "workspace");
        const service = new GitService(makeConfig(originDir, workspaceDir));
        await service.sync();
        await writeFile(path.join(workspaceDir, "README.md"), "local dirty change\n", "utf8");
        await writeFile(path.join(seedDir, "README.md"), "v2\n", "utf8");
        await runGit(["-C", seedDir, "add", "."]);
        await runGit(["-C", seedDir, "commit", "-m", "update readme"]);
        await runGit(["-C", seedDir, "push", "origin", "main"]);
        const result = await service.sync();
        const originHead = await runGit(["-C", originDir, "rev-parse", "--short=8", "main"]);
        const workspaceContent = (await runGit(["-C", workspaceDir, "show", "HEAD:README.md"])).trim();
        expect(result.action).toBe("pull");
        expect(result.commitSha).toBe(originHead);
        expect(workspaceContent).toBe("v2");
    });
});
