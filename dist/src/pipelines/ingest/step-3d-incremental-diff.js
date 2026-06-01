import { apiServiceClassName, serviceRelativePath } from "../codegen/api-naming.js";
export function step3dIncrementalDiff(input) {
    const existingApis = [];
    const newApis = [];
    const skipGenerate = [];
    const touchFiles = new Set();
    const serviceClasses = new Set(input.repoIndex.services.map((entry) => entry.className));
    for (const api of input.apiContracts.apis) {
        const className = apiServiceClassName(api.apiId);
        const servicePath = serviceRelativePath(api.apiId, input.productId);
        const exists = serviceClasses.has(className) ||
            input.repoIndex.services.some((entry) => entry.filePath === servicePath);
        if (exists) {
            existingApis.push(api.apiId);
            skipGenerate.push(api.apiId);
        }
        else {
            newApis.push(api.apiId);
        }
    }
    for (const journey of input.repoIndex.journeys) {
        touchFiles.add(journey.filePath);
    }
    for (const spec of input.repoIndex.specs) {
        touchFiles.add(spec.filePath);
    }
    return {
        schemaVersion: "03d-incremental-diff-v1",
        productId: input.productId,
        mode: "incremental",
        newApis,
        existingApis,
        skipGenerate,
        touchFiles: [...touchFiles]
    };
}
