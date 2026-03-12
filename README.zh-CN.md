<p align="center">
  <img src="doc/assets/header.png" alt="Paperclip — 运行你的公司" width="720" />
</p>

<p align="center">
  <a href="#快速开始"><strong>快速开始</strong></a> &middot;
  <a href="https://paperclip.ing/docs"><strong>文档</strong></a> &middot;
  <a href="https://github.com/147228/paperclip"><strong>GitHub</strong></a> &middot;
  <a href="https://discord.gg/m4HZY7xNG3"><strong>Discord</strong></a>
</p>

<p align="center">
  <a href="https://github.com/paperclipai/paperclip/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://github.com/paperclipai/paperclip/stargazers"><img src="https://img.shields.io/github/stars/paperclipai/paperclip?style=flat" alt="Stars" /></a>
  <a href="https://discord.gg/m4HZY7xNG3"><img src="https://img.shields.io/discord/000000000?label=discord" alt="Discord" /></a>
</p>

<br/>

> **🇨🇳 这是 Paperclip 的中文汉化版**，基于 [paperclipai/paperclip](https://github.com/paperclipai/paperclip) 原版项目，前端 UI 已全面翻译为中文。

<br/>

## Paperclip 是什么？

# 零人类公司的开源编排系统

**如果 OpenClaw 是一名 _员工_，那么 Paperclip 就是整个 _公司_。**

Paperclip 是一个 Node.js 服务器 + React 前端，用于编排一支 AI Agent 团队来运营业务。接入你自己的 Agent，分配目标，在统一的仪表盘上追踪 Agent 的工作与费用。

它看起来像一个任务管理器 — 但底层具备组织架构、预算管理、治理机制、目标对齐和 Agent 协调能力。

**管理业务目标，而不是 Pull Request。**

|        | 步骤           | 示例                                                         |
| ------ | -------------- | ------------------------------------------------------------ |
| **01** | 定义目标       | _"打造排名第一的 AI 笔记应用，做到 100 万美元 MRR。"_        |
| **02** | 组建团队       | CEO、CTO、工程师、设计师、市场 — 任何 Bot，任何提供商。      |
| **03** | 审批并运行     | 审核策略，设定预算，点击开始，在仪表盘中监控一切。           |

<br/>

> **即将推出：Clipmart** — 一键下载并运行整个公司。浏览预构建的公司模板 — 完整的组织架构、Agent 配置和技能 — 几秒钟内导入你的 Paperclip 实例。

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><strong>兼容<br/>平台</strong></td>
    <td align="center"><img src="doc/assets/logos/openclaw.svg" width="32" alt="OpenClaw" /><br/><sub>OpenClaw</sub></td>
    <td align="center"><img src="doc/assets/logos/claude.svg" width="32" alt="Claude" /><br/><sub>Claude Code</sub></td>
    <td align="center"><img src="doc/assets/logos/codex.svg" width="32" alt="Codex" /><br/><sub>Codex</sub></td>
    <td align="center"><img src="doc/assets/logos/cursor.svg" width="32" alt="Cursor" /><br/><sub>Cursor</sub></td>
    <td align="center"><img src="doc/assets/logos/bash.svg" width="32" alt="Bash" /><br/><sub>Bash</sub></td>
    <td align="center"><img src="doc/assets/logos/http.svg" width="32" alt="HTTP" /><br/><sub>HTTP</sub></td>
  </tr>
</table>

<em>只要能接收心跳，就能被录用。</em>

</div>

<br/>

## 汉化版说明

本仓库是 Paperclip 的**中文汉化分支**，对前端 UI 进行了全面的中文翻译：

- **覆盖 92 个文件**，约 3000 行变更
- **翻译范围**：按钮、标签、占位符、帮助文字、错误消息、标题、描述、aria-label
- **保留技术术语**：Agent、Adapter、Token、API、Claude、Codex 等专业术语保持英文
- **不影响功能**：仅翻译 UI 展示文本，不修改变量名、API 路径、状态枚举值等底层逻辑

### 翻译覆盖区域

| 区域 | 说明 |
|------|------|
| 导航与布局 | 侧边栏、顶栏、命令面板、面包屑导航、移动端导航 |
| 对话框 | 新建 Agent/任务/项目/目标弹窗 |
| 所有页面 | 仪表盘、Agent 列表与详情、任务、项目、目标、收件箱、费用、动态、设置、认证、审批 |
| Agent 配置 | 配置表单（54KB）、适配器选项、权限设置、运行策略 |
| 适配器 UI | Claude、Codex、Gemini、OpenCode、OpenClaw、Cursor、Pi、Process、HTTP |
| 通用组件 | 状态徽标、优先级图标、筛选栏、看板、评论、属性面板 |
| 引导向导 | 完整的 4 步引导流程 |

<br/>

## Paperclip 适合你，如果

- ✅ 你想构建**自主运行的 AI 公司**
- ✅ 你需要**协调多种不同 Agent**（OpenClaw、Codex、Claude、Cursor）朝共同目标前进
- ✅ 你同时开了 **20 个 Claude Code 终端**，已经搞不清谁在干什么了
- ✅ 你想让 Agent **全天候自主运行**，但仍需要审计工作并在必要时介入
- ✅ 你想**监控费用**并执行预算管理
- ✅ 你想要一个管理 Agent 的流程，**用起来像任务管理器**
- ✅ 你想**在手机上管理**你的自主运行业务

<br/>

## 核心功能

<table>
<tr>
<td align="center" width="33%">
<h3>🔌 自带 Agent</h3>
任何 Agent，任何运行时，统一组织架构。只要能接收心跳，就能被录用。
</td>
<td align="center" width="33%">
<h3>🎯 目标对齐</h3>
每个任务都可追溯到公司使命。Agent 知道<em>做什么</em>以及<em>为什么做</em>。
</td>
<td align="center" width="33%">
<h3>💓 心跳机制</h3>
Agent 按计划唤醒，检查工作并执行。任务委派沿组织架构上下流转。
</td>
</tr>
<tr>
<td align="center">
<h3>💰 费用控制</h3>
每个 Agent 设定月度预算。达到上限即停止，杜绝费用失控。
</td>
<td align="center">
<h3>🏢 多公司支持</h3>
一次部署，管理多家公司。完全数据隔离。一个控制面板管理你的业务组合。
</td>
<td align="center">
<h3>🎫 工单系统</h3>
每次对话可追踪，每个决策有解释。完整的工具调用追踪和不可篡改的审计日志。
</td>
</tr>
<tr>
<td align="center">
<h3>🛡️ 治理机制</h3>
你是董事会。审批招聘、覆盖策略、暂停或终止任何 Agent — 随时随地。
</td>
<td align="center">
<h3>📊 组织架构图</h3>
层级、角色、汇报关系。你的 Agent 有上级、有职位、有岗位描述。
</td>
<td align="center">
<h3>📱 移动端适配</h3>
随时随地监控和管理你的自主运行业务。
</td>
</tr>
</table>

<br/>

## Paperclip 解决的问题

| 没有 Paperclip | 有了 Paperclip |
| --- | --- |
| ❌ 你开了 20 个 Claude Code 标签页，搞不清哪个在做什么。重启后全部丢失。 | ✅ 任务基于工单，对话按线程组织，会话跨重启持久保存。 |
| ❌ 你手动从多个地方收集上下文来提醒 Bot 你到底在做什么。 | ✅ 上下文从任务向上流经项目和公司目标 — Agent 始终知道做什么以及为什么。 |
| ❌ Agent 配置文件夹杂乱无章，你在重新发明任务管理、通信和 Agent 间协调。 | ✅ Paperclip 开箱即用提供组织架构、工单、委派和治理 — 你运行的是公司，不是一堆脚本。 |
| ❌ 失控的循环浪费数百美元 Token，在你发现之前就耗尽了配额。 | ✅ 费用追踪展示 Token 预算，超额时自动限制 Agent。管理层通过预算优先排序。 |
| ❌ 你有定期任务（客服、社交、报告），每次都要手动启动。 | ✅ 心跳按计划处理常规工作。管理层负责监督。 |
| ❌ 有了想法，你得找到仓库、启动 Claude Code、保持标签页打开、全程盯着。 | ✅ 在 Paperclip 中添加任务。编码 Agent 会一直工作直到完成。管理层审核他们的工作。 |

<br/>

## 快速开始

开源。自托管。无需 Paperclip 账号。

```bash
npx paperclipai onboard --yes
```

或者手动安装：

```bash
git clone https://github.com/147228/paperclip.git
cd paperclip
git checkout zh-cn-localization
pnpm install
pnpm dev
```

启动后，API 服务器运行在 `http://localhost:3100`，前端运行在 `http://localhost:3101`。内嵌的 PostgreSQL 数据库会自动创建 — 无需额外配置。

> **环境要求：** Node.js 20+，pnpm 9.15+

<br/>

## 常见问题

**典型的部署架构是怎样的？**
本地运行时，单个 Node.js 进程管理内嵌的 Postgres 和本地文件存储。生产环境可接入你自己的 Postgres，按需部署。配置项目、Agent 和目标 — Agent 会处理剩下的事。

**可以运行多家公司吗？**
可以。单次部署可运行无限数量的公司，数据完全隔离。

**Paperclip 和 OpenClaw、Claude Code 等 Agent 有什么区别？**
Paperclip _使用_ 这些 Agent。它将它们编排成一家公司 — 具备组织架构、预算、目标、治理和责任机制。

**Agent 是持续运行的吗？**
默认情况下，Agent 按计划心跳和事件触发（任务分配、@提及）运行。你也可以接入持续运行的 Agent（如 OpenClaw）。你提供 Agent，Paperclip 负责协调。

<br/>

## 开发

```bash
pnpm dev              # 完整开发环境（API + UI，监听模式）
pnpm dev:once         # 完整开发环境（不监听文件变化）
pnpm dev:server       # 仅启动服务器
pnpm build            # 构建所有模块
pnpm typecheck        # 类型检查
pnpm test:run         # 运行测试
pnpm db:generate      # 生成数据库迁移
pnpm db:migrate       # 应用数据库迁移
```

详见 [doc/DEVELOPING.md](doc/DEVELOPING.md) 获取完整的开发指南。

<br/>

## 社区

- [Discord](https://discord.gg/m4HZY7xNG3) — 加入社区
- [GitHub Issues](https://github.com/paperclipai/paperclip/issues) — Bug 反馈和功能请求
- [GitHub Discussions](https://github.com/paperclipai/paperclip/discussions) — 想法和 RFC

<br/>

## 许可证

MIT &copy; 2026 Paperclip

<br/>

---

<p align="center">
  <sub>MIT 开源。为那些想运营公司而不是看管 Agent 的人而建。</sub>
</p>
