import type { AutomationCodegenMode } from "../config/automation-codegen-mode.js";
import type { RunResult } from "../orchestrator/state.js";
import type { CodegenTreeSummary, GeneratedFileNode } from "../infrastructure/io/read-codegen-tree.js";

export interface GenerateResponse extends RunResult {
  automationCodegenMode: AutomationCodegenMode;
  generated: {
    root: string;
    files: GeneratedFileNode[];
    summary: CodegenTreeSummary;
  };
}

export interface GenerateFilesResponse {
  runId: string;
  codegenRoot: string;
  generated: GenerateResponse["generated"];
}
