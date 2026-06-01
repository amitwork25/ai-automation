import path from "node:path";
function snakeToPascal(value) {
    return value
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("");
}
function snakeToCamel(value) {
    const pascal = snakeToPascal(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function snakeToKebab(value) {
    return value.replace(/_/g, "-").toLowerCase();
}
export function apiDomain(apiId) {
    return apiId.split(".")[0] || "api";
}
export function apiResource(apiId) {
    return apiId.split(".").slice(1).join("_") || "resource";
}
export function apiClassPrefix(apiId) {
    return snakeToPascal(apiDomain(apiId));
}
export function apiServiceClassName(apiId, stepMap) {
    const alias = stepMap?.serviceClassAliases?.[apiId];
    if (alias) {
        return alias;
    }
    return `${apiClassPrefix(apiId)}${snakeToPascal(apiResource(apiId))}Service`;
}
export function apiMethodBaseName(apiId, stepMap) {
    const alias = stepMap?.serviceMethodAliases?.[apiId];
    if (alias) {
        return alias;
    }
    return snakeToCamel(apiResource(apiId));
}
export function apiKebabSlug(apiId) {
    return snakeToKebab(apiResource(apiId));
}
export function modelBaseName(api) {
    if (api.responseSchemaRef) {
        return api.responseSchemaRef.replace(/Response$/, "");
    }
    return `${apiClassPrefix(api.apiId)}${snakeToPascal(apiResource(api.apiId))}`;
}
export function modelInterfaceName(api, kind) {
    const base = modelBaseName(api);
    return kind === "request" ? `${base}Request` : `${base}Response`;
}
export function servicePathSegments(apiId, productId) {
    const domain = apiDomain(apiId);
    if (domain === "eqx") {
        return ["src", "services", "eqx"];
    }
    return ["src", "services", "eqx", ...productId.split("/")];
}
export function modelPathSegments(apiId, productId) {
    const domain = apiDomain(apiId);
    if (domain === "eqx") {
        return ["src", "models", "eqx"];
    }
    return ["src", "models", "eqx", ...productId.split("/")];
}
export function schemaPathSegments(apiId, productId) {
    const domain = apiDomain(apiId);
    if (domain === "eqx") {
        return ["src", "schemas", "eqx"];
    }
    return ["src", "schemas", "eqx", ...productId.split("/")];
}
export function serviceTestPathSegments(apiId, productId) {
    const domain = apiDomain(apiId);
    if (domain === "eqx") {
        return ["tests", "service", "eqx", apiKebabSlug(apiId)];
    }
    return ["tests", "service", ...productId.split("/"), apiKebabSlug(apiId)];
}
export function joinRepoPath(repoRoot, segments, fileName) {
    return path.join(repoRoot, ...segments, fileName);
}
export function relativeRepoPath(repoRoot, absolutePath) {
    return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}
export function serviceRelativePath(apiId, productId) {
    const className = apiServiceClassName(apiId);
    const segments = servicePathSegments(apiId, productId);
    return path.join(...segments, `${className}.ts`);
}
export function modelRelativePath(apiId, productId) {
    return path.join(...modelPathSegments(apiId, productId), `${apiKebabSlug(apiId)}.models.ts`);
}
export function responseSchemaRelativePath(apiId, productId) {
    return path.join(...schemaPathSegments(apiId, productId), `${apiKebabSlug(apiId)}-response.schema.json`);
}
export function requestSchemaRelativePath(apiId, productId) {
    return path.join(...schemaPathSegments(apiId, productId), `${apiKebabSlug(apiId)}-request.schema.json`);
}
export function serviceSpecRelativePath(apiId, productId) {
    return path.join(...serviceTestPathSegments(apiId, productId), `${apiKebabSlug(apiId)}.service.spec.ts`);
}
