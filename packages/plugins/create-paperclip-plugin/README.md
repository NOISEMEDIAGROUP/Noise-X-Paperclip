# @paperclipai/create-paperclip-plugin

用于创建新 Paperclip 插件的脚手架工具。

```bash
npx @paperclipai/create-paperclip-plugin my-plugin
```

或者带选项：

```bash
npx @paperclipai/create-paperclip-plugin @acme/my-plugin \
  --template connector \
  --category connector \
  --display-name "Acme Connector" \
  --description "Syncs Acme data into Paperclip" \
  --author "Acme Inc"
```

支持的模板：`default`、`connector`、`workspace`
支持的类别：`connector`、`workspace`、`automation`、`ui`

生成内容：
- 带类型的清单文件 + Worker 入口点
- 使用 `@paperclipai/plugin-sdk/ui` 钩子的示例 UI 组件
- 使用 `@paperclipai/plugin-sdk/testing` 的测试文件
- 使用 SDK 打包器预设的 `esbuild` 和 `rollup` 配置文件
- 用于热重载的开发服务器脚本（`paperclip-plugin-dev-server`）

脚手架特意使用纯 React 元素而非宿主提供的 UI 套件组件，因为当前插件运行时尚未提供稳定的共享组件库。

在本仓库内部，生成的包通过 `workspace:*` 使用 `@paperclipai/plugin-sdk`。

在本仓库外部，脚手架会从你本地的 Paperclip 签出代码中将 `@paperclipai/plugin-sdk` 快照为 `.paperclip-sdk/` 压缩包，并将生成的包默认指向该本地文件。你可以显式覆盖 SDK 来源：

```bash
node packages/plugins/create-paperclip-plugin/dist/index.js @acme/my-plugin \
  --output /absolute/path/to/plugins \
  --sdk-path /absolute/path/to/paperclip/packages/plugins/sdk
```

这为你提供了在 SDK 发布到 npm 之前的仓库外本地开发路径。

## 脚手架生成后的工作流

```bash
cd my-plugin
pnpm install
pnpm dev       # 监听 Worker + 清单 + UI 包的构建
pnpm dev:ui    # 带热重载事件的本地 UI 预览服务器
pnpm test
```
