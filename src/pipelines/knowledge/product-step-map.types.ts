/** Product-specific step wiring — lives under agent-knowledge/{productId}/api-step-map.json */
export interface ProductStepMapConfig {
  productId: string;
  /** App entry auth steps (always prepended to every journey). */
  journeyEntrySteps: string[];
  apiToStep: Record<string, string>;
  stepWrites?: Record<string, Record<string, string>>;
  stepBodyLines?: Record<string, string[]>;
  serviceClassAliases?: Record<string, string>;
  serviceMethodAliases?: Record<string, string>;
  /** Relative import path from a service spec file to auth header helpers (optional). */
  authHeadersImport?: string;
  authHeadersBuilder?: string;
}

export const EMPTY_PRODUCT_STEP_MAP: ProductStepMapConfig = {
  productId: "",
  journeyEntrySteps: [],
  apiToStep: {},
  stepWrites: {},
  stepBodyLines: {}
};
