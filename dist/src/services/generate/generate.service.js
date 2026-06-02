import path from "node:path";
import { parseAutomationCodegenMode } from "../../config/automation-codegen-mode.js";
import { readCodegenTree } from "../../infrastructure/io/read-codegen-tree.js";
import { parseUploadedJson, parseUploadedYaml } from "../../infrastructure/io/parse-uploaded-yaml.js";
export class GenerateService {
    runService;
    projectRoot;
    constructor(runService, projectRoot = process.cwd()) {
        this.runService = runService;
        this.projectRoot = projectRoot;
    }
    async generate(input) {
        const automationCodegenMode = parseAutomationCodegenMode(input.mode);
        const openApiSpec = parseUploadedYaml(input.apiContractYaml, "apiContract");
        const manualTestCases = parseUploadedJson(input.manualTestCasesJson, "manualTestCases");
        const result = await this.runService.createRun({
            productId: input.productId,
            manualTestCases,
            openApiSpec,
            automationCodegenMode,
            mappingThreshold: input.mappingThreshold ?? 0.85,
            strictMapping: input.strictMapping ?? false,
            llmProfile: input.llmProfile ?? "standard",
            useVectorRetrieval: input.useVectorRetrieval ?? false
        });
        const generated = await this.buildGeneratedPayload(result.codegenRoot);
        return {
            ...result,
            automationCodegenMode,
            generated
        };
    }
    async getGeneratedFiles(runId) {
        const run = await this.runService.getRun(runId);
        const generated = await this.buildGeneratedPayload(run.codegenRoot);
        return {
            runId: run.runId,
            codegenRoot: run.codegenRoot,
            generated
        };
    }
    async buildGeneratedPayload(codegenRoot) {
        const absoluteRoot = path.isAbsolute(codegenRoot)
            ? codegenRoot
            : path.resolve(this.projectRoot, codegenRoot);
        const { files, summary } = await readCodegenTree(absoluteRoot);
        return {
            root: "generated",
            files,
            summary
        };
    }
}
