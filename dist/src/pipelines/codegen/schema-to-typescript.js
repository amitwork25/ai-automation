function quoteProperty(name) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name}"`;
}
function schemaType(schema) {
    if (!schema) {
        return "unknown";
    }
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
        return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
    }
    const type = schema.type;
    if (type === "string") {
        return "string";
    }
    if (type === "integer" || type === "number") {
        return "number";
    }
    if (type === "boolean") {
        return "boolean";
    }
    if (type === "array") {
        const items = schema.items;
        return `${schemaType(items)}[]`;
    }
    if (type === "object") {
        return "Record<string, unknown>";
    }
    return "unknown";
}
function renderProperties(schema, indent) {
    const properties = schema.properties ?? {};
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const lines = [];
    for (const [name, propertySchema] of Object.entries(properties)) {
        const optional = required.has(name) ? "" : "?";
        lines.push(`${indent}${quoteProperty(name)}${optional}: ${schemaType(propertySchema)};`);
    }
    return lines.join("\n");
}
export function jsonSchemaToInterface(name, schema) {
    if (!schema || schema.type !== "object") {
        return `export interface ${name} {\n  [key: string]: unknown;\n}\n`;
    }
    const body = renderProperties(schema, "  ");
    if (!body) {
        return `export interface ${name} {\n  [key: string]: unknown;\n}\n`;
    }
    return `export interface ${name} {\n${body}\n}\n`;
}
export function jsonSchemaDocument(description, schema) {
    const base = schema && typeof schema === "object" ? { ...schema } : { type: "object", properties: {} };
    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        description,
        ...base
    };
}
