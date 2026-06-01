import type {
  ApiContract,
  ApiContractsArtifact,
  DependencyEdge,
  DependencyGraphArtifact,
  SchemaIndexArtifact
} from "../contracts/pipeline.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function resolveRefName(ref?: string): string | undefined {
  if (!ref) {
    return undefined;
  }
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

function extractProperties(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const record = schema as UnknownRecord;
  if (typeof record.$ref === "string") {
    return [];
  }
  const properties = record.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }
  return Object.keys(properties as Record<string, unknown>);
}

function resolveSchemaRequired(
  schema: unknown,
  components: UnknownRecord | undefined
): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const record = schema as UnknownRecord;
  if (typeof record.$ref === "string" && components) {
    const schemas = components.schemas as Record<string, unknown> | undefined;
    const name = resolveRefName(record.$ref);
    if (name && schemas?.[name]) {
      return resolveSchemaRequired(schemas[name], components);
    }
  }
  if (Array.isArray(record.required)) {
    return record.required.map((field) => asString(field)).filter(Boolean);
  }
  return [];
}

function resolveSchemaProperties(schema: unknown, components: UnknownRecord | undefined): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const record = schema as UnknownRecord;
  if (typeof record.$ref === "string" && components) {
    const schemas = components.schemas as Record<string, unknown> | undefined;
    const name = resolveRefName(record.$ref);
    if (name && schemas?.[name]) {
      return extractProperties(schemas[name]);
    }
  }
  return extractProperties(schema);
}

function collectRefNames(value: unknown, refs: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectRefNames(entry, refs));
    return;
  }
  const record = value as UnknownRecord;
  if (typeof record.$ref === "string") {
    refs.add(record.$ref);
  }
  Object.values(record).forEach((entry) => collectRefNames(entry, refs));
}

function topologicalLayers(nodes: string[], edges: DependencyEdge[]): string[][] {
  const indegree = new Map<string, number>(nodes.map((node) => [node, 0]));
  const outgoing = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!nodes.includes(edge.from) || !nodes.includes(edge.to)) {
      return;
    }
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    const list = outgoing.get(edge.from) || [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  });

  const layers: string[][] = [];
  let current = nodes.filter((node) => (indegree.get(node) || 0) === 0);
  const seen = new Set<string>();

  while (current.length > 0) {
    layers.push(current);
    const next: string[] = [];
    current.forEach((node) => {
      seen.add(node);
      (outgoing.get(node) || []).forEach((to) => {
        const degree = (indegree.get(to) || 0) - 1;
        indegree.set(to, degree);
        if (degree === 0) {
          next.push(to);
        }
      });
    });
    current = next;
  }

  const remaining = nodes.filter((node) => !seen.has(node));
  if (remaining.length > 0) {
    layers.push(remaining);
  }
  return layers;
}

function parseDependencyEdges(raw: unknown): DependencyEdge[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(isRecord)
    .map((edge) => ({
      from: asString(edge.from || edge.source),
      to: asString(edge.to || edge.target),
      via: asString(edge.via || edge.variable, "runtime_var"),
      extract: asString(edge.extract) || undefined,
      inject: asString(edge.inject) || undefined
    }))
    .filter((edge) => edge.from && edge.to);
}

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

/**
 * Parses an external OpenAPI 3 / Swagger 2 spec into pipeline artifacts (02, 02b, 02c).
 * Uses x-apiId when present; falls back to operationId.
 */
export function parseOpenApiSpec(
  spec: Record<string, unknown>,
  productId: string
): {
  apiContracts: ApiContractsArtifact;
  dependencyGraph: DependencyGraphArtifact;
  schemaIndex: SchemaIndexArtifact;
} {
  const components = (spec.components as UnknownRecord | undefined) || {};
  const paths = (spec.paths as Record<string, Record<string, UnknownRecord>>) || {};
  const apis: ApiContract[] = [];
  const edges: DependencyEdge[] = [];

  Object.entries(paths).forEach(([pathTemplate, methods]) => {
    Object.entries(methods).forEach(([methodKey, operation]) => {
      if (!HTTP_METHODS.has(methodKey.toLowerCase())) {
        return;
      }

      const method = methodKey.toUpperCase();
      const apiId = asString(
        operation["x-apiId"] || operation.operationId,
        `api.${method.toLowerCase()}_${pathTemplate.replace(/\//g, "_")}`
      );

      const requestBody = operation.requestBody as UnknownRecord | undefined;
      const jsonContent = (requestBody?.content as UnknownRecord | undefined)?.["application/json"] as
        | UnknownRecord
        | undefined;
      const requestSchema = jsonContent?.schema;
      const requestSchemaRef = resolveRefName((requestSchema as { $ref?: string } | undefined)?.$ref);

      const responses = (operation.responses as Record<string, UnknownRecord>) || {};
      const successResponse = responses["200"] || responses["201"] || responses["204"];
      const responseContent = (successResponse?.content as UnknownRecord | undefined)?.[
        "application/json"
      ] as UnknownRecord | undefined;
      const responseSchema = responseContent?.schema;
      const responseSchemaRef = resolveRefName((responseSchema as { $ref?: string } | undefined)?.$ref);

      apis.push({
        apiId,
        method,
        path: pathTemplate,
        auth: asString(operation["x-auth"]) || "bearer",
        title: asString(operation.summary || operation.description) || undefined,
        operationId: asString(operation.operationId) || undefined,
        requestSchemaRef,
        responseSchemaRef,
        requestRequired: resolveSchemaRequired(requestSchema, components),
        responseFields: resolveSchemaProperties(responseSchema, components)
      });

      edges.push(...parseDependencyEdges(operation["x-dependsOn"]));
    });
  });

  if (apis.length === 0) {
    throw new Error("OpenAPI spec contains no HTTP operations under paths.");
  }

  const globalEdges = parseDependencyEdges(spec["x-dependencyGraph"]);
  const allEdges = [...edges, ...globalEdges];
  const uniqueKey = new Set<string>();
  const uniqueEdges = allEdges.filter((edge) => {
    const key = `${edge.from}->${edge.to}:${edge.via}`;
    if (uniqueKey.has(key)) {
      return false;
    }
    uniqueKey.add(key);
    return true;
  });

  const apiIds = apis.map((api) => api.apiId);
  const schemas = (components.schemas as Record<string, unknown>) || {};
  const refs = new Set<string>();
  collectRefNames(spec, refs);
  const unresolvedRefs = [...refs].filter((ref) => {
    if (!ref.startsWith("#/components/schemas/")) {
      return false;
    }
    const schemaName = resolveRefName(ref);
    return schemaName ? !(schemaName in schemas) : false;
  });

  return {
    apiContracts: {
      productId,
      apis
    },
    dependencyGraph: {
      edges: uniqueEdges,
      executionLayers: topologicalLayers(apiIds, uniqueEdges)
    },
    schemaIndex: {
      schemas,
      unresolvedRefs
    }
  };
}

export function isOpenApiSpec(raw: UnknownRecord): boolean {
  return typeof raw.openapi === "string" || typeof raw.swagger === "string" || !!raw.paths;
}
