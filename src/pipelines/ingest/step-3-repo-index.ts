import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

import type { ReferencePattern, RepoIndexArtifact, RepoServiceEntry, RepoSymbolEntry } from "../../contracts/pipeline.js";

function productSegments(productId: string): string[] {
  return productId.split("/").filter(Boolean);
}

async function walkTypeScriptFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function extractExportedSymbols(sourceFile: ts.SourceFile): RepoSymbolEntry[] {
  const symbols: RepoSymbolEntry[] = [];

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      symbols.push({
        name: node.name.text,
        filePath: sourceFile.fileName,
        kind: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ? "async_function" : "function"
      });
    }

    if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      symbols.push({
        name: node.name.text,
        filePath: sourceFile.fileName,
        kind: "function"
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

function extractExportedClasses(sourceFile: ts.SourceFile): RepoServiceEntry[] {
  const classes: RepoServiceEntry[] = [];

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      classes.push({
        className: node.name.text,
        filePath: sourceFile.fileName
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return classes;
}

function toRelative(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function buildReferencePatterns(productId: string, folderLayout: Record<string, string>): ReferencePattern[] {
  const patterns: ReferencePattern[] = [];

  if (folderLayout.sharedSteps) {
    patterns.push({
      id: "shared_steps",
      description: "Shared integration steps",
      paths: [folderLayout.sharedSteps]
    });
  }
  if (folderLayout.journeyExample) {
    patterns.push({
      id: "journey_example",
      description: "Reference journey module",
      paths: [folderLayout.journeyExample]
    });
  }
  if (folderLayout.specExample) {
    patterns.push({
      id: "integration_spec_example",
      description: "Reference integration spec",
      paths: [folderLayout.specExample]
    });
  }
  if (folderLayout.serviceExample) {
    patterns.push({
      id: "service_test_example",
      description: "Reference service test folder",
      paths: [folderLayout.serviceExample]
    });
  }

  if (patterns.length === 0 && productId) {
    patterns.push({
      id: "product_integration_root",
      description: `${productId} integration root`,
      paths: [folderLayout.integrationRoot].filter(Boolean)
    });
  }

  return patterns;
}

export async function step3RepoIndex(input: {
  productId: string;
  repoRoot: string;
}): Promise<RepoIndexArtifact> {
  const segments = productSegments(input.productId);
  const integrationRoot = path.join(input.repoRoot, "tests/integration", ...segments);
  const serviceRoot = path.join(input.repoRoot, "src/services/eqx", ...segments);

  const integrationFiles = await walkTypeScriptFiles(integrationRoot);
  const serviceFiles = (await walkTypeScriptFiles(serviceRoot)).filter((filePath) => filePath.endsWith("Service.ts"));

  const steps: RepoSymbolEntry[] = [];
  const journeys: RepoSymbolEntry[] = [];
  const assertions: RepoSymbolEntry[] = [];
  const specs: Array<{ name: string; filePath: string }> = [];
  const services: RepoServiceEntry[] = [];

  for (const filePath of integrationFiles) {
    const content = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const relPath = toRelative(input.repoRoot, filePath);
    const exported = extractExportedSymbols(sourceFile).map((entry) => ({
      ...entry,
      filePath: relPath
    }));

    if (relPath.endsWith("/shared/steps.ts")) {
      steps.push(
        ...exported.filter(
          (entry) => entry.name.endsWith("Step") || /^get\w+TestData$/.test(entry.name)
        )
      );
    } else if (relPath.endsWith("/journey.ts")) {
      journeys.push(...exported.filter((entry) => entry.name.startsWith("run") || entry.name.includes("Journey")));
    } else if (relPath.endsWith("/assertions.ts")) {
      assertions.push(...exported.filter((entry) => entry.name.startsWith("assert")));
    } else if (relPath.endsWith(".spec.ts")) {
      specs.push({ name: path.basename(filePath), filePath: relPath });
    }
  }

  for (const filePath of serviceFiles) {
    const content = await readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    services.push(
      ...extractExportedClasses(sourceFile).map((entry) => ({
        ...entry,
        filePath: toRelative(input.repoRoot, filePath)
      }))
    );
  }

  const sharedSteps = path.join("tests/integration", ...segments, "shared/steps.ts");
  const journeyExample = path.join("tests/integration", ...segments, "new-user/journey.ts");
  const specExample = specs.find((spec) => spec.name.includes("journey"))?.filePath
    ?? path.join("tests/integration", ...segments, "ccbp-new-journey.spec.ts");
  const serviceExample = path.join("tests/service", ...segments, "bill-fetch");

  const folderLayout: Record<string, string> = {
    integrationRoot: path.join("tests/integration", ...segments),
    sharedSteps,
    journeyExample,
    specExample,
    serviceRoot: path.join("src/services/eqx", ...segments),
    schemasRoot: path.join("src/schemas/eqx", ...segments),
    serviceTestRoot: path.join("tests/service", ...segments),
    serviceExample
  };

  return {
    schemaVersion: "03-repo-index-v1",
    productId: input.productId,
    repoRoot: input.repoRoot,
    services,
    steps,
    journeys,
    assertions,
    specs,
    folderLayout,
    referencePatterns: buildReferencePatterns(input.productId, folderLayout)
  };
}
