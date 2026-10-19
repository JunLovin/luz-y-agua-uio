/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");
const functionsDir = join(root, "supabase/functions");
const workspaces = ["packages/shared", "packages/extractor", "scripts"].map(
  (dir) => join(root, dir),
);

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

/** Version Node resolves for `name` from the workspace that declares it. */
function installedVersion(name: string): string | undefined {
  for (const workspace of workspaces) {
    const { dependencies = {}, devDependencies = {} } = readJson<
      Record<string, Record<string, string>>
    >(join(workspace, "package.json"));
    if (!(name in dependencies) && !(name in devDependencies)) continue;
    for (const dir of [workspace, root]) {
      const manifest = join(dir, "node_modules", name, "package.json");
      if (existsSync(manifest))
        return readJson<{ version: string }>(manifest).version;
    }
  }
  return undefined;
}

const npmImports = readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const { imports } = readJson<{ imports: Record<string, string> }>(
      join(functionsDir, entry.name, "deno.json"),
    );
    return Object.values(imports)
      .filter((spec) => spec.startsWith("npm:"))
      .map((spec) => {
        const [, name = "", version = ""] =
          /^npm:(@?[^@]+)@(.+)$/.exec(spec) ?? [];
        return [entry.name, name, version] as const;
      });
  });

describe("Edge Function import maps", () => {
  it.each(npmImports)(
    "%s pins %s to the version installed for Node",
    (_fn, name, version) => {
      expect(version).toBe(installedVersion(name));
    },
  );
});
