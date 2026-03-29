import { existsSync } from "node:fs";
import path from "node:path";

const FALLBACK_ROOT_DIRNAME = "paperclip-orginal";

const REQUIRED_WORKSPACE_MANIFESTS = [
  "packages/db/package.json",
  "packages/shared/package.json",
  "packages/adapter-utils/package.json",
  "packages/adapters/codex-local/package.json",
  "packages/adapters/cursor-local/package.json",
  "packages/adapters/opencode-local/package.json",
];

const ROOT_PROJECT_PATHS = [
  "packages/db",
  "packages/shared",
  "packages/adapters/opencode-local",
  "server",
  "ui",
  "cli",
];

const COMMON_EXCLUDE_GLOBS = [
  "**/node_modules/**",
  "**/.paperclip/workspaces/**",
  "**/tests/release-smoke/**",
];

const ROOT_ONLY_EXCLUDE_GLOBS = ["**/paperclip-orginal/**"];

const CRITICAL_IMPORT_ALIASES = {
  "@paperclipai/db": "packages/db/src/index.ts",
  "@paperclipai/shared": "packages/shared/src/index.ts",
  "@paperclipai/adapter-utils": "packages/adapter-utils/src/index.ts",
  "@paperclipai/adapter-utils/server-utils": "packages/adapter-utils/src/server-utils.ts",
  "@paperclipai/adapter-codex-local/server": "packages/adapters/codex-local/src/server/index.ts",
  "@paperclipai/adapter-cursor-local/server": "packages/adapters/cursor-local/src/server/index.ts",
};

function hasRequiredWorkspaceManifests(baseDir, fileExists) {
  return REQUIRED_WORKSPACE_MANIFESTS.every((relativePath) =>
    fileExists(path.join(baseDir, relativePath)),
  );
}

export function resolveVitestSourceRoot({
  repoRoot = process.cwd(),
  fileExists = existsSync,
} = {}) {
  if (hasRequiredWorkspaceManifests(repoRoot, fileExists)) {
    return repoRoot;
  }

  const fallbackRoot = path.join(repoRoot, FALLBACK_ROOT_DIRNAME);
  if (hasRequiredWorkspaceManifests(fallbackRoot, fileExists)) {
    return fallbackRoot;
  }

  return repoRoot;
}

function buildVitestProjects({ repoRoot, sourceRoot }) {
  return ROOT_PROJECT_PATHS.map((relativePath) =>
    path.relative(repoRoot, path.join(sourceRoot, relativePath)).split(path.sep).join("/"),
  );
}

function buildVitestExclude({ repoRoot, sourceRoot }) {
  return sourceRoot === repoRoot
    ? [...COMMON_EXCLUDE_GLOBS, ...ROOT_ONLY_EXCLUDE_GLOBS]
    : [...COMMON_EXCLUDE_GLOBS];
}

function buildVitestAlias(sourceRoot) {
  return Object.fromEntries(
    Object.entries(CRITICAL_IMPORT_ALIASES).map(([specifier, relativePath]) => [
      specifier,
      path.join(sourceRoot, relativePath),
    ]),
  );
}

export function resolveVitestRootConfigContext({
  repoRoot = process.cwd(),
  fileExists = existsSync,
} = {}) {
  const sourceRoot = resolveVitestSourceRoot({ repoRoot, fileExists });
  return {
    sourceRoot,
    projects: buildVitestProjects({ repoRoot, sourceRoot }),
    exclude: buildVitestExclude({ repoRoot, sourceRoot }),
    alias: buildVitestAlias(sourceRoot),
  };
}
