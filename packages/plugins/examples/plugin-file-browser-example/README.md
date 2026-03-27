# 文件浏览器示例插件

演示以下功能的 Paperclip 示例插件：

- **projectSidebarItem** — 在侧边栏中每个项目下方添加一个可选的"文件"链接，点击后打开项目详情页并选中本插件的标签页。此功能由插件设置控制，默认关闭。
- **detailTab**（entityType 为 project）— 项目详情标签页，包含工作区路径选择器、桌面端双栏布局（左侧文件树、右侧编辑器）以及移动端单面板流程（从编辑器返回文件树的返回按钮），并支持保存功能。

这是一个用于开发的仓库本地示例插件。除非明确包含，否则不应被视为可用于通用生产构建。

## 插槽

| 插槽                | 类型                | 描述                                      |
|---------------------|---------------------|--------------------------------------------------|
| Files（侧边栏）     | `projectSidebarItem`| 每个项目下的可选链接 → 项目详情 + 标签页。 |
| Files（标签页）      | `detailTab`         | 响应式文件树/编辑器布局，支持保存。|

## 设置

- `Show Files in Sidebar` — 切换项目侧边栏链接的显示/隐藏。默认关闭。
- `Comment File Links` — 控制是否显示评论注解和评论上下文菜单操作。

## 功能权限

- `ui.sidebar.register` — 项目侧边栏项
- `ui.detailTab.register` — 项目详情标签页
- `projects.read` — 解析项目
- `project.workspaces.read` — 列出工作区并读取文件访问路径

## Worker

- **getData `workspaces`** — `ctx.projects.listWorkspaces(projectId, companyId)`（按顺序排列，主工作区优先）。
- **getData `fileList`** — `{ projectId, workspaceId, directoryPath? }` → 列出工作区根目录或子目录的目录条目（Node `fs`）。
- **getData `fileContent`** — `{ projectId, workspaceId, filePath }` → 使用工作区相对路径读取文件内容（Node `fs`）。
- **performAction `writeFile`** — `{ projectId, workspaceId, filePath, content }` → 将当前编辑器缓冲区内容写回磁盘。

## 本地安装（开发环境）

在仓库根目录下，构建插件并通过本地路径安装：

```bash
pnpm --filter @paperclipai/plugin-file-browser-example build
pnpm paperclipai plugin install ./packages/plugins/examples/plugin-file-browser-example
```

卸载方式：

```bash
pnpm paperclipai plugin uninstall paperclip-file-browser-example --force
```

**本地开发注意事项：**

- **请先构建。** 宿主通过清单中的 `entrypoints.worker`（例如 `./dist/worker.js`）解析 Worker。在安装前请先在插件目录中运行 `pnpm build`，确保 Worker 文件存在。
- **仅限开发环境的安装路径。** 本地路径安装方式假定已签出此 monorepo 源代码。对于部署安装，请发布 npm 包，而不要依赖宿主上存在 `packages/plugins/examples/...` 路径。
- **拉取代码后请重新安装。** 如果你在服务器存储 `package_path` 之前通过本地路径安装了插件，插件可能会显示状态 **error**（找不到 Worker）。请卸载后重新安装，以便服务器持久化路径并激活插件。
- 可选：使用 `paperclip-plugin-dev-server`，通过插件配置中的 `devUiUrl` 实现 UI 热重载。

## 结构

- `src/manifest.ts` — 包含 `projectSidebarItem` 和 `detailTab`（entityTypes 为 `["project"]`）的清单文件。
- `src/worker.ts` — 工作区、文件列表、文件内容的数据处理器。
- `src/ui/index.tsx` — `FilesLink`（侧边栏）和 `FilesTab`（工作区路径选择器 + 双面板文件树/编辑器）。
