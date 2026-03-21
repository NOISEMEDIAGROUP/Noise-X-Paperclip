import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listPaperclipSkillEntries,
  removeMaintainerOnlySkillSymlinks,
  ensurePaperclipSkillSymlink,
} from "@paperclipai/adapter-utils/server-utils";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// Windows-compatible symlink that handles symlinks, junctions, and copies
async function windowsCompatibleSymlink(source: string, target: string): Promise<void> {
  const isDir = (await fs.stat(source)).isDirectory();
  const linkType = isDir ? "dir" : "file";
  
  // Try regular symlink first
  try {
    await fs.symlink(source, target);
    return;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "EPERM") throw error;
  }
  
  // On Windows, try junction for directories (doesn't require elevation)
  if (isDir) {
    try {
      await fs.symlink(source, target, "junction");
      return;
    } catch {
      // Fall through to copy
    }
  }
  
  // Last resort: recursive copy for directories, copy file for files
  if (isDir) {
    await fs.cp(source, target, { recursive: true });
  } else {
    await fs.copyFile(source, target);
  }
}

describe("paperclip skill utils", () => {
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("lists runtime skills from ./skills without pulling in .agents/skills", async () => {
    const root = await makeTempDir("paperclip-skill-roots-");
    cleanupDirs.add(root);

    const moduleDir = path.join(root, "a", "b", "c", "d", "e");
    await fs.mkdir(moduleDir, { recursive: true });
    await fs.mkdir(path.join(root, "skills", "paperclip"), { recursive: true });
    await fs.mkdir(path.join(root, ".agents", "skills", "release"), { recursive: true });

    const entries = await listPaperclipSkillEntries(moduleDir);

    expect(entries.map((entry) => entry.key)).toEqual(["paperclipai/paperclip/paperclip"]);
    expect(entries.map((entry) => entry.runtimeName)).toEqual(["paperclip"]);
    expect(entries[0]?.source).toBe(path.join(root, "skills", "paperclip"));
  });

  it("removes stale maintainer-only symlinks from a shared skills home", async () => {
    const root = await makeTempDir("paperclip-skill-cleanup-");
    cleanupDirs.add(root);

    const skillsHome = path.join(root, "skills-home");
    const runtimeSkill = path.join(root, "skills", "paperclip");
    const customSkill = path.join(root, "custom", "release-notes");
    const staleMaintainerSkill = path.join(root, ".agents", "skills", "release");

    await fs.mkdir(skillsHome, { recursive: true });
    await fs.mkdir(runtimeSkill, { recursive: true });
    await fs.mkdir(customSkill, { recursive: true });
    await fs.mkdir(staleMaintainerSkill, { recursive: true });

    try {
      // Use Windows-compatible symlinks
      await windowsCompatibleSymlink(runtimeSkill, path.join(skillsHome, "paperclip"));
      await windowsCompatibleSymlink(customSkill, path.join(skillsHome, "release-notes"));
      await windowsCompatibleSymlink(staleMaintainerSkill, path.join(skillsHome, "release"));

      const removed = await removeMaintainerOnlySkillSymlinks(skillsHome, ["paperclip"]);

      expect(removed).toEqual(["release"]);
      await expect(fs.lstat(path.join(skillsHome, "release"))).rejects.toThrow();
      
      // Check that the other links still exist
      expect(await fs.lstat(path.join(skillsHome, "paperclip"))).toBeTruthy();
      expect(await fs.lstat(path.join(skillsHome, "release-notes"))).toBeTruthy();
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EPERM' && process.platform === 'win32') {
        // Skip this test on Windows if we can't create symlinks/junctions even with fallback
        console.warn('Skipping symlink test on Windows due to permission restrictions');
        return;
      }
      throw error;
    }
  });

  it("handles ensurePaperclipSkillSymlink with Windows-compatible fallback", async () => {
    const root = await makeTempDir("paperclip-symlink-test-");
    cleanupDirs.add(root);

    const source = path.join(root, "source");
    const target = path.join(root, "target");
    
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, "test.txt"), "hello");

    try {
      // Test with our Windows-compatible fallback
      const result = await ensurePaperclipSkillSymlink(source, target, windowsCompatibleSymlink);
      
      expect(["created", "skipped", "repaired"]).toContain(result);
      
      // Verify the target exists and points to/contains the right content
      const targetExists = await fs.stat(target).then(() => true).catch(() => false);
      expect(targetExists).toBe(true);
      
      // Check content exists (either via symlink/junction or copy)
      const content = await fs.readFile(path.join(target, "test.txt"), "utf8");
      expect(content).toBe("hello");
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EPERM' && process.platform === 'win32') {
        console.warn('Skipping ensurePaperclipSkillSymlink test on Windows due to permission restrictions');
        return;
      }
      throw error;
    }
  });
});