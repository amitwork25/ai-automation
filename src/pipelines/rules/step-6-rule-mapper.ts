import type {
  ApprovedRulesConfig,
  AssertionCatalog,
  BusinessRule,
  BusinessRulesArtifact,
  BusinessRulesMappedArtifact,
  RuleMapping
} from "../../contracts/pipeline.js";

function findCatalogTemplate(
  catalog: AssertionCatalog,
  rule: BusinessRule
): AssertionCatalog["templates"][number] | undefined {
  if (rule.assertFn) {
    const byAssertFn = catalog.templates.find((template) => template.match.assertFn === rule.assertFn);
    if (byAssertFn) {
      return byAssertFn;
    }
  }

  return catalog.templates.find((template) => {
    const match = template.match;
    if (match.op && rule.op !== match.op) {
      return false;
    }
    if (match.path && rule.path !== match.path) {
      return false;
    }
    if ("value" in match && match.value !== undefined && rule.expected !== match.value) {
      return false;
    }
    return Boolean(match.op || match.assertFn);
  });
}

function findApprovedMapping(
  approved: ApprovedRulesConfig | undefined,
  rule: BusinessRule
): ApprovedRulesConfig["rules"][number] | undefined {
  if (!approved) {
    return undefined;
  }

  return approved.rules.find((entry) => {
    if (entry.ruleId && entry.ruleId === rule.ruleId) {
      return true;
    }
    if (entry.textPattern) {
      return new RegExp(entry.textPattern, "i").test(rule.text);
    }
    return false;
  });
}

function mapRule(
  rule: BusinessRule,
  catalog: AssertionCatalog,
  approved: ApprovedRulesConfig | undefined
): RuleMapping {
  if (rule.layer === "non_automatable" || rule.parseStatus === "unmapped") {
    if (rule.parseStatus === "unmapped") {
      return {
        ruleId: rule.ruleId,
        status: "custom",
        reason: "Unresolved English expected result — candidate for step 5g/12"
      };
    }
    return {
      ruleId: rule.ruleId,
      status: "non_automatable",
      reason: "UI-only or manual verification"
    };
  }

  const approvedMapping = findApprovedMapping(approved, rule);
  if (approvedMapping) {
    return {
      ruleId: rule.ruleId,
      status: approvedMapping.status,
      templateId: approvedMapping.templateId,
      contextPath: approvedMapping.contextPath ?? rule.path,
      expected: approvedMapping.expected ?? rule.expected,
      assertFn: approvedMapping.assertFn ?? rule.assertFn,
      reason: "Approved rule mapping"
    };
  }

  const template = findCatalogTemplate(catalog, rule);
  if (template) {
    return {
      ruleId: rule.ruleId,
      status: "template",
      templateId: template.templateId,
      contextPath: rule.path,
      expected: rule.expected,
      assertFn: rule.assertFn,
      reason: `Catalog match: ${template.templateId}`
    };
  }

  if (rule.assertFn) {
    return {
      ruleId: rule.ruleId,
      status: "custom",
      assertFn: rule.assertFn,
      reason: "Known assert function without catalog template"
    };
  }

  return {
    ruleId: rule.ruleId,
    status: "custom",
    contextPath: rule.path,
    expected: rule.expected,
    reason: "Complex or uncatalogued rule"
  };
}

export function step6RuleMapper(input: {
  productId: string;
  businessRules: BusinessRulesArtifact;
  assertionCatalog: AssertionCatalog;
  approvedRules?: ApprovedRulesConfig;
  mappingThreshold?: number;
}): BusinessRulesMappedArtifact {
  const mappingThreshold = input.mappingThreshold ?? 0.9;
  const mappings = input.businessRules.rules.map((rule) =>
    mapRule(rule, input.assertionCatalog, input.approvedRules)
  );

  const templateCount = mappings.filter((entry) => entry.status === "template").length;
  const customCount = mappings.filter((entry) => entry.status === "custom").length;
  const nonAutomatableCount = mappings.filter((entry) => entry.status === "non_automatable").length;
  const approvedCount = mappings.filter((entry) => entry.status === "approved").length;
  const mappedCount = templateCount + approvedCount + nonAutomatableCount;
  const totalRules = mappings.length;
  const mappingRate = totalRules === 0 ? 1 : Number((mappedCount / totalRules).toFixed(3));

  return {
    schemaVersion: "06-business-rules-mapped-v1",
    productId: input.productId,
    mappings,
    pendingCustom: mappings.filter((entry) => entry.status === "custom").map((entry) => entry.ruleId),
    mappingMeta: {
      totalRules,
      templateCount,
      customCount,
      nonAutomatableCount,
      approvedCount,
      mappingRate,
      targetMet: mappingRate >= mappingThreshold
    }
  };
}
