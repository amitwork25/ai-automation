import type { BusinessRulesArtifact } from "../../contracts/pipeline.js";
import { loadApprovedRules, loadAssertionCatalog } from "../../pipelines/rules/load-rule-knowledge.js";
import { step6RuleMapper } from "../../pipelines/rules/step-6-rule-mapper.js";
import type { IArtifactStore } from "../../ports/IArtifactStore.js";
import type { RunState } from "../state.js";

export async function mapRulesNode(
  state: RunState,
  artifactStore: IArtifactStore
): Promise<Partial<RunState>> {
  const businessRules = await artifactStore.readJson<BusinessRulesArtifact>(
    state.runId,
    "05-business-rules.json"
  );
  const [assertionCatalog, approvedRules] = await Promise.all([
    loadAssertionCatalog(),
    loadApprovedRules(state.productId)
  ]);

  const mappedRules = step6RuleMapper({
    productId: state.productId,
    businessRules,
    assertionCatalog,
    approvedRules
  });

  const artifactName = "06-business-rules-mapped.json";
  const artifactPath = await artifactStore.writeJson(state.runId, artifactName, mappedRules);
  return {
    artifacts: {
      ...state.artifacts,
      [artifactName]: artifactPath
    }
  };
}
