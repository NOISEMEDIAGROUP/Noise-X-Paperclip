# AGENTS.md

为在本仓库工作的人类和 AI 贡献者提供的指导。

## 1. 项目目的

Paperclip 是面向 AI 智能体公司的控制平面。
当前实现目标为 V1，定义在 `doc/SPEC-implementation.md` 中。

## 2. 请先阅读以下内容

在进行修改之前，请按以下顺序阅读：

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` 是长期产品背景。
`doc/SPEC-implementation.md` 是具体的 V1 构建合约。

## 3. 仓库结构

- `server/`：Express REST API 和编排服务
- `ui/`：React + Vite 面板 UI
- `packages/db/`：Drizzle schema、迁移、数据库客户端
- `packages/shared/`：共享类型、常量、验证器、API 路径常量
- `packages/adapters/`：智能体适配器实现（Claude、Codex、Cursor 等）
- `packages/adapter-utils/`：共享适配器工具
- `packages/plugins/`：插件系统包
- `doc/`：运维和产品文档

## 4. 开发环境搭建（自动数据库）

在开发环境中使用内嵌的 PGlite，不设置 `DATABASE_URL` 即可。

```sh
pnpm install
pnpm dev
```

启动后包含：

- API：`http://localhost:3100`
- UI：`http://localhost:3100`（在开发中间件模式下由 API 服务器提供）

快速检查：

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

重置本地开发数据库：

```sh
rm -rf data/pglite
pnpm dev
```

## 5. 核心工程规则

1. 保持变更限定在公司范围内。
每个领域实体都应限定在公司范围内，路由/服务中必须强制执行公司边界。

2. 保持合约同步。
如果你更改了 schema/API 行为，需更新所有受影响的层：
- `packages/db` schema 和导出
- `packages/shared` 类型/常量/验证器
- `server` 路由/服务
- `ui` API 客户端和页面

3. 保持控制平面不变量。
- 单一指派人任务模型
- 原子性的 issue 检出语义
- 受治理操作的审批门控
- 预算硬性停止自动暂停行为
- 变更操作的活动日志记录

4. 除非被要求，不要整体替换战略文档。
优先进行增量更新。保持 `doc/SPEC.md` 和 `doc/SPEC-implementation.md` 的一致性。

5. 保持计划文档标注日期并集中管理。
新的计划文档应放在 `doc/plans/` 中，使用 `YYYY-MM-DD-slug.md` 文件命名格式。

## 6. 数据库变更工作流

更改数据模型时：

1. 编辑 `packages/db/src/schema/*.ts`
2. 确保新表从 `packages/db/src/schema/index.ts` 导出
3. 生成迁移：

```sh
pnpm db:generate
```

4. 验证编译：

```sh
pnpm -r typecheck
```

注意事项：
- `packages/db/drizzle.config.ts` 从 `dist/schema/*.js` 读取编译后的 schema
- `pnpm db:generate` 会先编译 `packages/db`

## 7. 提交前验证

在声明完成之前运行以下完整检查：

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

如果有任何检查无法运行，请明确报告哪些未运行及原因。

## 8. API 和认证要求

- 基础路径：`/api`
- 面板访问视为具有完全控制权的操作员上下文
- 智能体访问使用 Bearer API 密钥（`agent_api_keys`），静态存储时进行哈希处理
- 智能体密钥不得访问其他公司的数据

添加接口时：

- 应用公司访问检查
- 强制执行操作者权限（面板 vs 智能体）
- 为变更操作写入活动日志条目
- 返回一致的 HTTP 错误（`400/401/403/404/409/422/500`）

## 9. UI 要求

- 保持路由和导航与可用的 API 接口对齐
- 在公司范围页面中使用公司选择上下文
- 清晰地展示失败信息；不要静默忽略 API 错误

## 10. 完成的定义

当以下条件全部满足时，变更才算完成：

1. 行为符合 `doc/SPEC-implementation.md`
2. 类型检查、测试和构建通过
3. 合约在 db/shared/server/ui 之间保持同步
4. 当行为或命令发生变更时，文档已更新
