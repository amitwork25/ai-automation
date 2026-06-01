export type RunStatus = "running" | "completed" | "failed";

export type RunMode = "greenfield" | "incremental";

export type LlmProfile = "minimal" | "standard" | "full";

export type { AutomationCodegenMode } from "../config/automation-codegen-mode.js";
import type { AutomationCodegenMode } from "../config/automation-codegen-mode.js";

export interface RunInputs {
  manualTestCases: unknown;
  apiContracts?: unknown;
  postmanCollection?: unknown;
  openApiSpec?: unknown;
  apiAliases?: unknown;
  mappingThreshold: number;
  strictMapping: boolean;
  mode: RunMode;
  automationCodegenMode?: AutomationCodegenMode;
  useVectorRetrieval?: boolean;
  llmProfile?: LlmProfile;
}

export interface RunPipelineFlags {
  unmappedRuleCount: number;
  pendingCustomCount: number;
  linkerLlmInvoked?: boolean;
  serviceTestLlmInvoked?: boolean;
}

export interface RunState {
  runId: string;
  productId: string;
  repoRoot: string;
  codegenRoot: string;
  inputs: RunInputs;
  artifacts: Record<string, string>;
  errors: string[];
  status: RunStatus;
  flags?: RunPipelineFlags;
}

export interface RunResult {
  runId: string;
  productId: string;
  repoRoot: string;
  codegenRoot: string;
  artifacts: Record<string, string>;
  errors: string[];
  status: RunStatus;
}
