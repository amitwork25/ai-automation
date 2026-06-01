import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adaptApiContracts, materializeApiArtifacts } from "../../../src/adapters/api-contract.adapter.js";
import { parseOpenApiSpec } from "../../../src/adapters/openapi-contract.parser.js";
describe("openapi-contract.parser", () => {
    it("parses CCBP OpenAPI contract into 02/02b/02c artifacts", async () => {
        const specPath = path.resolve("inputs/bbps-ccbp/api-contract.openapi.json");
        const spec = JSON.parse(await readFile(specPath, "utf8"));
        const artifacts = parseOpenApiSpec(spec, "bbps/ccbp");
        expect(artifacts.apiContracts.apis.length).toBeGreaterThanOrEqual(20);
        expect(artifacts.apiContracts.apis.some((api) => api.apiId === "ccbp.bill_fetch")).toBe(true);
        expect(artifacts.apiContracts.apis.find((api) => api.apiId === "ccbp.bill_fetch")?.path).toBe("/bbps/v1/billDesk/bbps/bill-fetch");
        expect(artifacts.dependencyGraph.edges.some((edge) => edge.from === "ccbp.bill_fetch")).toBe(true);
        expect(artifacts.schemaIndex.schemas.CcbpBillFetchRequest).toBeDefined();
        expect(artifacts.schemaIndex.unresolvedRefs).toHaveLength(0);
    });
    it("adapts OpenAPI file via adaptApiContracts + materializeApiArtifacts", async () => {
        const specPath = path.resolve("inputs/bbps-ccbp/api-contract.openapi.json");
        const spec = JSON.parse(await readFile(specPath, "utf8"));
        const adapted = adaptApiContracts(spec, "bbps/ccbp");
        expect(adapted.kind).toBe("openapi");
        const artifacts = materializeApiArtifacts(adapted, "bbps/ccbp");
        const billFetch = artifacts.apiContracts.apis.find((api) => api.apiId === "ccbp.bill_fetch");
        expect(billFetch?.requestRequired).toContain("billerId");
        expect(billFetch?.responseFields).toContain("validation_id");
    });
});
