import type {
  ApiContract,
  ApiContractsArtifact,
  DependencyEdge,
  DependencyGraphArtifact,
  SchemaIndexArtifact
} from "../../contracts/pipeline.js";

interface PostmanRequest {
  method?: string;
  url?: string | { raw?: string; path?: string[] };
  header?: Array<{ key?: string; value?: string }>;
  auth?: { type?: string };
  body?: { raw?: string };
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  response?: Array<{ code?: number; body?: string }>;
  item?: PostmanItem[];
  dependsOn?: Array<{
    apiId: string;
    via?: string;
    extract?: string;
    inject?: string;
  }>;
}

interface OpenApiOperation {
  operationId?: string;
  requestBody?: {
    content?: Record<string, { schema?: { $ref?: string } }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

function flattenPostmanItems(items: PostmanItem[]): PostmanItem[] {
  return items.flatMap((item) =>
    item.item && item.item.length > 0 ? flattenPostmanItems(item.item) : [item]
  );
}

function sanitizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getPath(input: PostmanRequest["url"]): string {
  if (!input) {
    return "/";
  }

  if (typeof input === "string") {
    return input.replace(/^https?:\/\/[^/]+/i, "");
  }

  if (input.raw) {
    return input.raw.replace(/^https?:\/\/[^/]+/i, "");
  }

  if (Array.isArray(input.path) && input.path.length > 0) {
    return `/${input.path.join("/")}`;
  }

  return "/";
}

function buildApiId(productId: string, item: PostmanItem, path: string): string {
  const nameToken = sanitizeToken(item.name || "");
  const segments = path
    .split("/")
    .map((segment) => sanitizeToken(segment))
    .filter(
      (segment) =>
        segment &&
        !["v1", "v2", "api", "bbps", "billdesk", "service", "services", "bbps_v1"].includes(segment)
    );
  const action = segments[segments.length - 1] || nameToken || "endpoint";
  const domainHint = segments.find((segment) => ["auth", "ccbp", "upi"].includes(segment));
  const defaultDomain = sanitizeToken(productId.split("/").slice(-1)[0] || "api");
  return `${domainHint || defaultDomain}.${action}`;
}

function resolveRefName(ref?: string): string | undefined {
  if (!ref) {
    return undefined;
  }
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

function parseJson(input: string | undefined): unknown {
  if (!input) {
    return undefined;
  }
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function extractProperties(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const schemaRecord = schema as Record<string, unknown>;
  const properties = schemaRecord.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }
  return Object.keys(properties as Record<string, unknown>);
}

function getOperation(
  openApiSpec: Record<string, unknown> | undefined,
  path: string,
  method: string
): OpenApiOperation | undefined {
  if (!openApiSpec) {
    return undefined;
  }

  const paths = openApiSpec.paths as Record<string, Record<string, OpenApiOperation>> | undefined;
  if (!paths) {
    return undefined;
  }
  return paths[path]?.[method.toLowerCase()];
}

function collectRefNames(value: unknown, refs: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectRefNames(entry, refs));
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    refs.add(record.$ref);
  }
  Object.values(record).forEach((entry) => collectRefNames(entry, refs));
}

function topologicalLayers(nodes: string[], edges: DependencyEdge[]): string[][] {
  const indegree = new Map<string, number>(nodes.map((node) => [node, 0]));
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    const arr = outgoing.get(edge.from) || [];
    arr.push(edge.to);
    outgoing.set(edge.from, arr);
  }

  const layers: string[][] = [];
  let current = nodes.filter((node) => (indegree.get(node) || 0) === 0);
  const seen = new Set<string>();
  while (current.length > 0) {
    layers.push(current);
    const next: string[] = [];
    for (const node of current) {
      seen.add(node);
      for (const to of outgoing.get(node) || []) {
        const newDegree = (indegree.get(to) || 0) - 1;
        indegree.set(to, newDegree);
        if (newDegree === 0) {
          next.push(to);
        }
      }
    }
    current = next;
  }

  const remaining = nodes.filter((node) => !seen.has(node));
  if (remaining.length > 0) {
    layers.push(remaining);
  }
  return layers;
}

export function step2ApiContracts(input: {
  productId: string;
  postmanCollection: { item?: unknown[] };
  openApiSpec?: Record<string, unknown>;
}): {
  apiContracts: ApiContractsArtifact;
  dependencyGraph: DependencyGraphArtifact;
  schemaIndex: SchemaIndexArtifact;
} {
  const flatItems = flattenPostmanItems((input.postmanCollection.item || []) as PostmanItem[]);
  const apis: ApiContract[] = flatItems.map((item) => {
    const method = (item.request?.method || "GET").toUpperCase();
    const path = getPath(item.request?.url);
    const operation = getOperation(input.openApiSpec, path, method);
    const requestSchemaRef = resolveRefName(
      operation?.requestBody?.content?.["application/json"]?.schema?.$ref
    );
    const responseSchema = operation?.responses?.["200"]?.content?.["application/json"]?.schema;
    const responseSchemaRef =
      responseSchema && typeof responseSchema === "object" && "$ref" in responseSchema
        ? resolveRefName((responseSchema as { $ref?: string }).$ref)
        : undefined;
    const responseSample = item.response?.find((response) => response.code === 200)?.body;
    const sampleJson = parseJson(responseSample);
    const responseFields = new Set<string>([
      ...Object.keys((sampleJson as Record<string, unknown>) || {}),
      ...extractProperties(responseSchema)
    ]);
    const requestRequired = Array.isArray(
      operation?.requestBody?.content?.["application/json"]?.schema &&
        (operation.requestBody.content["application/json"].schema as Record<string, unknown>)
          .required
    )
      ? (
          operation?.requestBody?.content?.["application/json"]?.schema as {
            required?: string[];
          }
        ).required || []
      : [];

    return {
      apiId: buildApiId(input.productId, item, path),
      method,
      path,
      auth: item.request?.auth?.type,
      title: item.name,
      operationId: operation?.operationId,
      requestSchemaRef,
      responseSchemaRef,
      requestRequired,
      responseFields: [...responseFields],
      samples: sampleJson ? { "200": sampleJson } : undefined
    };
  });

  const apiIds = apis.map((api) => api.apiId);
  const edges: DependencyEdge[] = [];

  flatItems.forEach((item, index) => {
    const toApiId = apis[index]?.apiId;
    if (!toApiId) {
      return;
    }

    if (item.dependsOn && item.dependsOn.length > 0) {
      item.dependsOn.forEach((dep) => {
        edges.push({
          from: dep.apiId,
          to: toApiId,
          via: dep.via || "runtime_var",
          extract: dep.extract,
          inject: dep.inject
        });
      });
      return;
    }

    const hasAuthToken = item.request?.header?.some((header) => header.value?.includes("{{auth_token}}"));
    if (hasAuthToken) {
      const authProducer = apiIds.find((apiId) => apiId.includes("verify_otp"));
      if (authProducer && authProducer !== toApiId) {
        edges.push({
          from: authProducer,
          to: toApiId,
          via: "auth_token",
          extract: "data.auth_token",
          inject: "authorization"
        });
      }
    }
  });

  const uniqueEdgeKey = new Set<string>();
  const uniqueEdges = edges.filter((edge) => {
    const key = `${edge.from}->${edge.to}:${edge.via}:${edge.inject || ""}`;
    if (uniqueEdgeKey.has(key)) {
      return false;
    }
    uniqueEdgeKey.add(key);
    return true;
  });

  const executionLayers = topologicalLayers(apiIds, uniqueEdges);

  const schemas = (input.openApiSpec?.components as { schemas?: Record<string, unknown> } | undefined)
    ?.schemas || {};
  const refs = new Set<string>();
  collectRefNames(input.openApiSpec, refs);
  const unresolvedRefs = [...refs].filter((ref) => {
    if (!ref.startsWith("#/components/schemas/")) {
      return false;
    }
    const schemaName = resolveRefName(ref);
    return schemaName ? !(schemaName in schemas) : false;
  });

  return {
    apiContracts: {
      productId: input.productId,
      apis
    },
    dependencyGraph: {
      edges: uniqueEdges,
      executionLayers
    },
    schemaIndex: {
      schemas,
      unresolvedRefs
    }
  };
}
