import path from "node:path";

import type { GenerateFilesResponse, GenerateResponse } from "../../contracts/generate.js";
import {
  parseAutomationCodegenMode,
  type AutomationCodegenMode
} from "../../config/automation-codegen-mode.js";
import { readCodegenTree } from "../../infrastructure/io/read-codegen-tree.js";
import {
  parseUploadedJson,
  parseUploadedYaml
} from "../../infrastructure/io/parse-uploaded-yaml.js";
import type { LlmProfile } from "../../orchestrator/state.js";
import type { IRunService } from "../runs/run.service.js";

export interface GenerateFromUploadInput {
  productId?: string;
  mode?: string;
  apiContractYaml: string;
  manualTestCasesJson: string;
  mappingThreshold?: number;
  strictMapping?: boolean;
  llmProfile?: LlmProfile;
  useVectorRetrieval?: boolean;
}

export interface IGenerateService {
  generate(input: GenerateFromUploadInput): Promise<GenerateResponse>;
  getGeneratedFiles(runId: string): Promise<GenerateFilesResponse>;
}

export class GenerateService implements IGenerateService {
  constructor(
    private readonly runService: IRunService,
    private readonly projectRoot = process.cwd()
  ) {}

  async generate(input: GenerateFromUploadInput): Promise<GenerateResponse> {
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

  async getGeneratedFiles(runId: string): Promise<GenerateFilesResponse> {
    const run = await this.runService.getRun(runId);
    const generated = await this.buildGeneratedPayload(run.codegenRoot);
    return {
      runId: run.runId,
      codegenRoot: run.codegenRoot,
      generated
    };
  }

  private async buildGeneratedPayload(
    codegenRoot: string
  ): Promise<GenerateResponse["generated"]> {
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
