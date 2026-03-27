# 插件编写冒烟测试示例

一个 Paperclip 插件

## 开发

```bash
pnpm install
pnpm dev            # 监听构建
pnpm dev:ui         # 带热重载事件的本地开发服务器
pnpm test
```

## 安装到 Paperclip

```bash
pnpm paperclipai plugin install ./
```

## 构建选项

- `pnpm build` 使用 `@paperclipai/plugin-sdk/bundlers` 的 esbuild 预设。
- `pnpm build:rollup` 使用同一 SDK 的 rollup 预设。
