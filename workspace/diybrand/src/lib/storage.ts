import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const UPLOAD_DIR = join(process.cwd(), "data", "logos");

/** Ensure the upload directory exists. */
async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/** Map common mime types to file extensions. */
function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return map[mimeType] || "png";
}

/**
 * Save a logo image to disk.
 * @returns The relative path from the uploads dir (e.g. "abc-123.png")
 */
export async function saveLogo(
  id: string,
  data: Buffer,
  mimeType: string
): Promise<string> {
  await ensureDir();
  const ext = extFromMime(mimeType);
  const filename = `${id}.${ext}`;
  await writeFile(join(UPLOAD_DIR, filename), data);
  return filename;
}

/** Read a logo file from disk. Returns null if not found. */
export async function readLogo(
  filename: string
): Promise<Buffer | null> {
  const filepath = join(UPLOAD_DIR, filename);
  try {
    return await readFile(filepath);
  } catch {
    return null;
  }
}

/** Delete a logo file from disk. Silently ignores missing files. */
export async function deleteLogo(filename: string): Promise<void> {
  const filepath = join(UPLOAD_DIR, filename);
  try {
    await unlink(filepath);
  } catch {
    // ignore missing files
  }
}
