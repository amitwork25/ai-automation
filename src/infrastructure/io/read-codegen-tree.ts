import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface GeneratedFileNode {
  path: string;
  content: string;
}

export interface CodegenTreeSummary {
  totalFiles: number;
  journeySpecFiles: number;
  serviceSpecFiles: number;
  srcFiles: number;
}

export async function readCodegenTree(generatedRoot: string): Promise<{
  files: GeneratedFileNode[];
  summary: CodegenTreeSummary;
}> {
  const files: GeneratedFileNode[] = [];

  async function walk(currentDir: string, relativePrefix: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const info = await stat(absolutePath);
      if (!info.isFile()) {
        continue;
      }
      const content = await readFile(absolutePath, "utf8");
      files.push({ path: relativePath.replace(/\\/g, "/"), content });
    }
  }

  await walk(generatedRoot, "");

  const summary: CodegenTreeSummary = {
    totalFiles: files.length,
    journeySpecFiles: files.filter((f) => f.path.includes("tests/integration/") && f.path.endsWith(".spec.ts"))
      .length,
    serviceSpecFiles: files.filter((f) => f.path.includes("tests/service/") && f.path.endsWith(".spec.ts"))
      .length,
    srcFiles: files.filter((f) => f.path.startsWith("src/")).length
  };

  return { files, summary };
}
