import { describe, expect, it } from "vitest";
import { parseUploadedJson, parseUploadedYaml } from "../../src/infrastructure/io/parse-uploaded-yaml.js";
const minimalOpenApi = `
openapi: "3.0.0"
info:
  title: Sample
  version: "1.0.0"
paths:
  /health:
    get:
      operationId: health
      responses:
        "200":
          description: ok
`;
describe("parse-uploaded-yaml", () => {
    it("parses OpenAPI YAML", () => {
        const doc = parseUploadedYaml(minimalOpenApi);
        expect(doc.openapi).toBe("3.0.0");
        expect(doc.paths).toBeTruthy();
    });
    it("rejects invalid YAML", () => {
        expect(() => parseUploadedYaml("paths: [")).toThrow(/not valid YAML/i);
    });
    it("parses manual test JSON", () => {
        const cases = parseUploadedJson('[{"id":"tc-1","steps":[]}]');
        expect(Array.isArray(cases)).toBe(true);
    });
});
