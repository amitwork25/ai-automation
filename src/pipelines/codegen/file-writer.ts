import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface WriteFileResult {
  path: string;
  relativePath: string;
  action: "created" | "skipped";
  reason?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeTextFile(input: {
  outputRoot: string;
  relativePath: string;
  content: string;
  overwrite?: boolean;
  /** @deprecated use outputRoot */
  repoRoot?: string;
}): Promise<WriteFileResult> {
  const root = input.outputRoot ?? input.repoRoot;
  if (!root) {
    throw new Error("writeTextFile requires outputRoot");
  }
  const absolutePath = path.join(root, input.relativePath);
  const exists = await fileExists(absolutePath);
  if (exists && !input.overwrite) {
    return {
      path: absolutePath,
      relativePath: input.relativePath,
      action: "skipped",
      reason: "file already exists"
    };
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.content, "utf8");
  return {
    path: absolutePath,
    relativePath: input.relativePath,
    action: "created"
  };
}
