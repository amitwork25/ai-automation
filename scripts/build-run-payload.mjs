import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualPath = path.join(rootDir, "inputs/bbps-ccbp/manual-test-cases.platform.json");
const openApiPath = path.join(rootDir, "inputs/bbps-ccbp/api-contract.openapi.json");
const outPath = path.join(rootDir, "inputs/bbps-ccbp/run-payload.json");

const manual = JSON.parse(readFileSync(manualPath, "utf8"));
const openApi = JSON.parse(readFileSync(openApiPath, "utf8"));

const payload = {
  productId: "bbps/ccbp",
  manualTestCases: manual,
  apiContracts: openApi,
  mappingThreshold: 1.0,
  strictMapping: false
};

writeFileSync(outPath, JSON.stringify(payload), "utf8");
console.log(`Wrote ${outPath}`);
