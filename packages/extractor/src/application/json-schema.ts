import { z } from "zod";

// Structured outputs reject numeric and string-length constraints; zod still validates them afterwards.
const UNSUPPORTED_KEYS = new Set([
  "$schema",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
]);

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (typeof node !== "object" || node === null) return node;
  const entries = Object.entries(node)
    .filter(([key]) => !UNSUPPORTED_KEYS.has(key))
    .map(([key, value]) => [key, clean(value)]);
  const result = Object.fromEntries(entries) as Record<string, unknown>;
  if (result.type === "object") result.additionalProperties = false;
  return result;
}

export function toOutputSchema(schema: z.ZodType): Record<string, unknown> {
  return clean(z.toJSONSchema(schema, { io: "input" })) as Record<
    string,
    unknown
  >;
}
