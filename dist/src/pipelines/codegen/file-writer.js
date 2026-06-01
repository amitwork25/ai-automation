import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export async function writeTextFile(input) {
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
