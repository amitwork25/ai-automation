import { randomUUID } from "node:crypto";
import path from "node:path";
import { resolveCodegenRoot, defaultRunsDir } from "../../pipelines/codegen/codegen-output-root.js";
import { persistApprovedKnowledge, step18Approve } from "../../pipelines/approve/step-18-approve.js";
import { executeRunGraph } from "../../orchestrator/graph.js";
export class RunService {
    frameworkIntelligence;
    artifactStore;
    projectRoot;
    constructor(frameworkIntelligence, artifactStore, projectRoot = process.cwd()) {
        this.frameworkIntelligence = frameworkIntelligence;
        this.artifactStore = artifactStore;
        this.projectRoot = projectRoot;
    }
    async createRun(input) {
        const frameworkStatus = await this.frameworkIntelligence.getStatus();
        if (!frameworkStatus.ready) {
            throw new Error("Framework workspace is not ready. Run /api/framework/refresh first.");
        }
        if (input.manualTestCases === undefined || input.manualTestCases === null) {
            throw new Error("manualTestCases is required");
        }
        if (!input.apiContracts && !input.postmanCollection && !input.openApiSpec) {
            throw new Error("apiContracts, postmanCollection, or openApiSpec is required");
        }
        const runId = randomUUID();
        const productId = input.productId?.trim() || "unknown-product";
        const runsDir = defaultRunsDir(this.projectRoot);
        const codegenRoot = resolveCodegenRoot(runsDir, runId);
        return executeRunGraph({
            artifactStore: this.artifactStore,
            runsDir
        }, {
            runId,
            productId,
            repoRoot: frameworkStatus.workspaceDir,
            codegenRoot,
            inputs: {
                manualTestCases: input.manualTestCases,
                apiContracts: input.apiContracts,
                postmanCollection: input.postmanCollection,
                openApiSpec: input.openApiSpec,
                apiAliases: input.apiAliases,
                mappingThreshold: input.mappingThreshold ?? 0.95,
                strictMapping: input.strictMapping ?? true,
                mode: input.mode ?? "greenfield",
                automationCodegenMode: input.automationCodegenMode ?? "both",
                useVectorRetrieval: input.useVectorRetrieval ?? false,
                llmProfile: input.llmProfile ?? "standard"
            },
            artifacts: {},
            errors: [],
            status: "running"
        });
    }
    async getRun(runId) {
        const artifactNames = await this.artifactStore.listArtifacts(runId);
        if (artifactNames.length === 0) {
            throw new Error(`Run not found: ${runId}`);
        }
        const meta = await this.artifactStore.readJson(runId, "00-run-meta.json");
        const artifacts = Object.fromEntries(artifactNames.map((name) => [name, path.join("runs", runId, name)]));
        let approvalStatus;
        if (artifactNames.includes("18-approval-manifest.json")) {
            const manifest = await this.artifactStore.readJson(runId, "18-approval-manifest.json");
            approvalStatus = manifest.approvalStatus;
        }
        if (artifactNames.includes("18-approval-result.json")) {
            approvalStatus = "approved";
        }
        return {
            runId: meta.runId,
            productId: meta.productId,
            status: artifactNames.includes("18-approval-result.json") ? "completed" : "completed",
            repoRoot: meta.repoRoot,
            codegenRoot: meta.codegenRoot ?? resolveCodegenRoot(defaultRunsDir(this.projectRoot), runId),
            artifacts,
            approvalStatus
        };
    }
    async approveRun(runId) {
        const artifactNames = await this.artifactStore.listArtifacts(runId);
        if (!artifactNames.includes("06-business-rules-mapped.json")) {
            throw new Error(`Run ${runId} is not ready for approval`);
        }
        if (artifactNames.includes("18-approval-result.json")) {
            throw new Error(`Run ${runId} is already approved`);
        }
        const meta = await this.artifactStore.readJson(runId, "00-run-meta.json");
        const [businessRules, mappedRules] = await Promise.all([
            this.artifactStore.readJson(runId, "05-business-rules.json"),
            this.artifactStore.readJson(runId, "06-business-rules-mapped.json")
        ]);
        const { approvedRules, result } = await step18Approve({
            runId,
            productId: meta.productId,
            businessRules,
            mappedRules,
            projectRoot: this.projectRoot
        });
        const { rulesApprovedPath, knowledgeIndexPath } = await persistApprovedKnowledge({
            productId: meta.productId,
            sourceRunId: runId,
            approvedRules,
            projectRoot: this.projectRoot
        });
        const approval = {
            ...result,
            rulesApprovedPath,
            knowledgeIndexPath
        };
        await this.artifactStore.writeJson(runId, "18-approval-result.json", approval);
        if (artifactNames.includes("18-approval-manifest.json")) {
            const manifest = await this.artifactStore.readJson(runId, "18-approval-manifest.json");
            await this.artifactStore.writeJson(runId, "18-approval-manifest.json", {
                ...manifest,
                approvalStatus: "approved"
            });
        }
        return {
            runId,
            productId: meta.productId,
            approval
        };
    }
}
