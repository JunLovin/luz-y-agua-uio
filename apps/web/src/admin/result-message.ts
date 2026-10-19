import { es } from "../i18n/es";

const t = es.admin;

type Params = Record<string, string | string[] | undefined>;

function lookup<T extends object>(
  table: T,
  key: unknown,
): T[keyof T] | undefined {
  return typeof key === "string" && Object.hasOwn(table, key)
    ? table[key as keyof T]
    : undefined;
}

function count(value: unknown): string {
  return typeof value === "string" && /^\d{1,6}$/.test(value) ? value : "0";
}

/** The status line for the ingestion page, built only from known keys and digits in the query string. */
export function resultMessage(params: Params): string | null {
  const result = params.resultado;
  if (result === "missing") return t.missingInput;
  if (result === "refused")
    return [t.results.refused, lookup(t.refusals, params.motivo)]
      .filter(Boolean)
      .join(" ");
  if (result === "extracted") {
    const counts: Record<string, string> = {
      high: count(params.high),
      medium: count(params.medium),
      low: count(params.low),
      rejected: count(params.rechazados),
    };
    return `${t.results.extracted} ${t.tiers.replace(/\{(\w+)\}/g, (_, key: string) => counts[key] ?? "0")}`;
  }
  return lookup(t.results, result) ?? null;
}
