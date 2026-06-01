import type {
  ApiContract,
  ApiContractsArtifact,
  DependencyEdge,
  DependencyGraphArtifact,
  SchemaIndexArtifact
} from "../contracts/pipeline.js";
import { isOpenApiSpec, parseOpenApiSpec } from "./openapi-contract.parser.js";
import { step2ApiContracts } from "../pipelines/ingest/step-2-api-contracts.js";

type UnknownRecord = Record<string, unknown>;

export type AdaptedApiSource =
  | {
      kind: "postman";
      postmanCollection: { item?: unknown[] };
      openApiSpec?: Record<string, unknown>;
    }
  | {
      kind: "openapi";
      openApiSpec: Record<string, unknown>;
    }
  | {
      kind: "prebuilt";
      apiContracts: ApiContractsArtifact;
      dependencyGraph: DependencyGraphArtifact;
      schemaIndex: SchemaIndexArtifact;
    };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function unwrapApiPayload(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  // Full OpenAPI/Swagger document — do not unwrap nested keys.
  if (isOpenApiSpec(raw)) {
    return raw;
  }

  if (raw.apiContracts !== undefined) {
    return raw.apiContracts;
  }
  if (raw.apiContract !== undefined) {
    return raw.apiContract;
  }
  if (raw.contracts !== undefined) {
    return raw.contracts;
  }
  if (raw.collection !== undefined) {
    return raw.collection;
  }
  if (raw.postmanCollection !== undefined) {
    return raw.postmanCollection;
  }
  if (raw.openApiSpec !== undefined && isRecord(raw.openApiSpec) && isOpenApiSpec(raw.openApiSpec)) {
    return raw.openApiSpec;
  }
  if (raw.openApi !== undefined && isRecord(raw.openApi) && isOpenApiSpec(raw.openApi)) {
    return raw.openApi;
  }
  return raw;
}

function isPostmanCollection(raw: UnknownRecord): boolean {
  return Array.isArray(raw.item);
}

function sanitizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildApiIdFromPath(path: string, fallbackName: string): string {
  const segments = path
    .split("/")
    .map((segment) => sanitizeToken(segment))
    .filter(
      (segment) =>
        segment &&
        !["v1", "v2", "api", "bbps", "billdesk", "service", "services"].includes(segment)
    );
  const action = segments[segments.length - 1] || sanitizeToken(fallbackName) || "endpoint";
  const domainHint = segments.find((segment) => ["auth", "ccbp", "upi", "customers"].includes(segment));
  return `${domainHint || "api"}.${action}`;
}

function parseContractRow(raw: UnknownRecord, index: number): ApiContract {
  const method = asString(raw.method || raw.httpMethod, "GET").toUpperCase();
  const path = asString(raw.path || raw.url || raw.endpoint || raw.route, "/");
  const apiId = asString(
    raw.apiId || raw.api_id || raw.id || raw.operationId || raw.operation_id,
    buildApiIdFromPath(path, asString(raw.name || raw.title, `api_${index + 1}`))
  );

  return {
    apiId,
    method,
    path,
    auth: asString(raw.auth) || undefined,
    title: asString(raw.name || raw.title) || undefined,
    operationId: asString(raw.operationId || raw.operation_id) || undefined,
    requestSchemaRef: asString(raw.requestSchemaRef || raw.request_schema_ref) || undefined,
    responseSchemaRef: asString(raw.responseSchemaRef || raw.response_schema_ref) || undefined,
    requestRequired: Array.isArray(raw.requestRequired)
      ? raw.requestRequired.map((field) => asString(field)).filter(Boolean)
      : [],
    responseFields: Array.isArray(raw.responseFields)
      ? raw.responseFields.map((field) => asString(field)).filter(Boolean)
      : [],
    samples: isRecord(raw.samples) ? (raw.samples as Record<string, unknown>) : undefined
  };
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

function adaptPrebuiltContracts(raw: unknown, productId: string): AdaptedApiSource {
  const payload = unwrapApiPayload(raw);
  let apis: ApiContract[] = [];
  let edges: DependencyEdge[] = [];
  let schemas: Record<string, unknown> = {};

  if (Array.isArray(payload)) {
    const rows = payload.filter(isRecord);
    apis = rows.map((row, index) => parseContractRow(row, index));
    rows.forEach((row) => {
      edges.push(...parseDependencyEdges(row.dependsOn || row.dependencies));
    });
  } else if (isRecord(payload)) {
    const list = payload.apis || payload.endpoints || payload.requests;
    if (Array.isArray(list)) {
      const rows = list.filter(isRecord);
      apis = rows.map((row, index) => parseContractRow(row, index));
      rows.forEach((row) => {
        edges.push(...parseDependencyEdges(row.dependsOn || row.dependencies));
      });
    }
    edges.push(...parseDependencyEdges(payload.edges || payload.dependencies || payload.dependencyGraph));
    if (isRecord(payload.schemas)) {
      schemas = payload.schemas as Record<string, unknown>;
    }
    if (isRecord(payload.schemaIndex) && isRecord(payload.schemaIndex.schemas)) {
      schemas = payload.schemaIndex.schemas as Record<string, unknown>;
    }
  }

  if (apis.length === 0) {
    throw new Error("Unsupported API contract format: no APIs found.");
  }

  const apiIds = apis.map((api) => api.apiId);
  const dependencyGraph: DependencyGraphArtifact = {
    edges,
    executionLayers: topologicalLayers(apiIds, edges)
  };

  return {
    kind: "prebuilt",
    apiContracts: {
      productId,
      apis
    },
    dependencyGraph,
    schemaIndex: {
      schemas,
      unresolvedRefs: []
    }
  };
}

/**
 * Accepts Postman/OpenAPI/custom API JSON and normalizes to pipeline ingest input.
 */
export function adaptApiContracts(
  raw: unknown,
  productId: string,
  openApiSpec?: unknown
): AdaptedApiSource {
  const payload = unwrapApiPayload(raw);

  if (isRecord(payload) && isPostmanCollection(payload)) {
    return {
      kind: "postman",
      postmanCollection: payload as { item?: unknown[] },
      openApiSpec: (openApiSpec as Record<string, unknown> | undefined) || undefined
    };
  }

  if (isRecord(payload) && isOpenApiSpec(payload)) {
    return {
      kind: "openapi",
      openApiSpec: payload
    };
  }

  if (
    Array.isArray(payload) ||
    (isRecord(payload) && (Array.isArray(payload.apis) || Array.isArray(payload.endpoints)))
  ) {
    return adaptPrebuiltContracts(payload, productId);
  }

  throw new Error(
    "Unsupported API contract format. Provide Postman collection, OpenAPI spec, or apis[] list."
  );
}

export function materializeApiArtifacts(
  source: AdaptedApiSource,
  productId: string
): {
  apiContracts: ApiContractsArtifact;
  dependencyGraph: DependencyGraphArtifact;
  schemaIndex: SchemaIndexArtifact;
} {
  if (source.kind === "prebuilt") {
    return {
      apiContracts: source.apiContracts,
      dependencyGraph: source.dependencyGraph,
      schemaIndex: source.schemaIndex
    };
  }

  if (source.kind === "openapi") {
    return parseOpenApiSpec(source.openApiSpec, productId);
  }

  return step2ApiContracts({
    productId,
    postmanCollection: source.postmanCollection,
    openApiSpec: source.openApiSpec
  });
}
