import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadApprovedRules } from "../rules/load-rule-knowledge.js";
import { saveApprovedRules } from "../knowledge/save-approved-rules.js";
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export async function step18Approve(input) {
    const projectRoot = input.projectRoot ?? process.cwd();
    const existing = await loadApprovedRules(input.productId, projectRoot);
    const nextVersion = (existing?.version ?? 0) + 1;
    const approvedAt = new Date().toISOString();
    const ruleTextById = new Map(input.businessRules.rules.map((rule) => [rule.ruleId, rule.text]));
    const approvedEntries = [];
    for (const mapping of input.mappedRules.mappings) {
        if (mapping.status === "non_automatable") {
            continue;
        }
        const text = ruleTextById.get(mapping.ruleId);
        approvedEntries.push({
            ruleId: mapping.ruleId,
            textPattern: text ? escapeRegex(text.slice(0, 120)) : undefined,
            status: mapping.status === "template" ? "approved" : mapping.status,
            templateId: mapping.templateId,
            contextPath: mapping.contextPath,
            expected: mapping.expected,
            assertFn: mapping.assertFn
        });
    }
    const approvedRules = {
        schemaVersion: "rules-approved-v1",
        productId: input.productId,
        version: nextVersion,
        approvedAt,
        sourceRunId: input.runId,
        rules: approvedEntries
    };
    return {
        approvedRules,
        result: {
            schemaVersion: "18-approval-result-v1",
            productId: input.productId,
            runId: input.runId,
            approvedAt,
            rulesApprovedVersion: nextVersion,
            approvedRuleCount: approvedEntries.length
        }
    };
}
export function step3aApprovedKnowledgeIndex(input) {
    const documents = input.approvedRules.rules.map((rule, index) => ({
        id: `ir_rule:${rule.ruleId ?? index}`,
        collection: "ir_rules",
        text: [
            rule.ruleId ?? "",
            rule.textPattern ?? "",
            rule.templateId ?? "",
            rule.contextPath ?? "",
            rule.assertFn ?? "",
            JSON.stringify(rule.expected ?? null)
        ].join("\n"),
        metadata: {
            ruleId: rule.ruleId,
            templateId: rule.templateId,
            assertFn: rule.assertFn
        }
    }));
    return {
        schemaVersion: "03a-approved-knowledge-v1",
        productId: input.productId,
        sourceRunId: input.sourceRunId,
        rulesVersion: input.approvedRules.version ?? 1,
        documents,
        summary: {
            totalDocuments: documents.length,
            indexedAt: new Date().toISOString()
        }
    };
}
export async function persistApprovedKnowledge(input) {
    const projectRoot = input.projectRoot ?? process.cwd();
    const rulesApprovedPath = await saveApprovedRules(input.approvedRules, projectRoot);
    const knowledgeIndex = step3aApprovedKnowledgeIndex({
        productId: input.productId,
        sourceRunId: input.sourceRunId,
        approvedRules: input.approvedRules
    });
    const knowledgeIndexPath = path.join(projectRoot, "agent-knowledge", input.productId, "03a-approved-knowledge-index.json");
    await mkdir(path.dirname(knowledgeIndexPath), { recursive: true });
    await writeFile(knowledgeIndexPath, JSON.stringify(knowledgeIndex, null, 2), "utf8");
    return { rulesApprovedPath, knowledgeIndexPath };
}
