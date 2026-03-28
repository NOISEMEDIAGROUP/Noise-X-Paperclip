# Penclip 上游同步与冲突处理 Runbook

## 1. 目的

这份文档说明后续从上游拉新代码时，如何在保留 Penclip 中文增强版能力的前提下，尽量低成本、低冲突地同步 `origin/master`。

目标不是“永远零冲突”，而是：

- 让冲突集中在少数已知文件
- 避免误把 Penclip 的品牌与本地化能力冲掉
- 避免把上游的结构性改进覆盖掉

## 2. 同步前提

同步前先确认：

- 当前工作区没有未提交的临时改动
- 你知道当前要同步的来源分支
- 你知道哪些改动是 Penclip 必须保留的 fork 差异

如果本仓库把原项目 remote 命名为 `origin`，就按 `origin/master` 执行。
如果另有 `upstream` remote，请把下面命令里的 remote 名替换成实际值。

## 3. Penclip 必须长期保留的 fork 差异

### 3.1 品牌与域名

用户可见层保留：

- `Penclip`
- `penclipai`
- `penclip.ing`
- `paperclipai.cn`

技术标识继续保留：

- `paperclip`
- `@paperclipai/*`
- `paperclipai` CLI
- `PAPERCLIP_*`

### 3.2 本地化基础设施

这些能力必须保留：

- `react-i18next` / `i18next` 根层接入
- `ui/src/i18n.ts`
- `ui/public/locales/zh-CN/common.json`
- `ui/public/locales/en/common.json`
- 默认 `zh-CN`
- 语言切换器
- `Accept-Language` / `Content-Language`
- 服务端用户可见错误的 locale 处理

### 3.3 Windows 兼容改造

这些改造不能在同步时被误回退：

- 用 Node 脚本替换 Unix-only shell 片段
- `dev/build` 链路中的 Windows 兼容处理
- `tsx` / dev watch 相关兼容修复

## 4. 推荐同步流程

### 4.1 创建同步分支

```sh
git checkout master
git pull --ff-only
git checkout -b codex/upstream-sync-YYYYMMDD
```

### 4.2 获取上游更新

```sh
git fetch origin
```

如果你用的是独立 upstream remote：

```sh
git fetch upstream
```

### 4.3 先看范围，不要直接合并

先看上游到底改了哪些区域：

```sh
git log --oneline --decorate --stat HEAD..origin/master
git diff --name-only HEAD..origin/master
```

先判断：

- 是否改到了我们长期维护的 i18n 基础设施
- 是否改到了高 churn UI 页面
- 是否改到了 package manifest 或 dev scripts

### 4.4 执行同步

推荐先用 merge，同步更直观：

```sh
git merge origin/master
```

如果团队明确偏好 rebase，也可以：

```sh
git rebase origin/master
```

在 Penclip 这种长期 fork 场景里，merge 往往更容易保留上下文。

## 5. 冲突处理原则

### 5.1 总原则

不要简单粗暴地：

- 全部选 `ours`
- 全部选 `theirs`
- 冲突一多就手工重做整个文件

更稳的方式是：

1. 先保住上游结构
2. 再把 Penclip 的差异按最小补丁接回去

### 5.2 哪些文件优先吸收上游结构

这些文件通常应该“以 upstream 结构为主，手动补回 Penclip 差异”：

- 大多数页面组件
- 共享组件
- server route/service 逻辑
- package manifest
- 构建脚本

原因：

- 上游可能修了 bug
- 上游可能重构了组件结构
- 直接保留旧 fork 文件，后面会越来越难合并

### 5.3 哪些文件必须手动合并

这些文件不要直接整文件选 `ours` 或 `theirs`，而是必须手动合：

- `ui/public/locales/zh-CN/common.json`
- `ui/public/locales/en/common.json`
- `ui/src/i18n.ts`
- `ui/src/main.tsx`
- 语言切换器相关组件
- server locale 中间件和错误处理
- `README.md`
- `README.zh-CN.md`

### 5.4 哪些文件通常优先保留 Penclip 版本

如果冲突集中在 Penclip 自己新增的文件，通常优先保留我们的版本：

- `doc/UI-LOCALIZATION.md`
- `doc/UPSTREAM-MERGE-RUNBOOK.md`
- `README.zh-CN.md`

前提是上游没有也新增同名文件。

## 6. 具体冲突处理策略

### 6.1 locale JSON

处理方式：

- 先保留上游新增 key
- 再补回 Penclip 已有翻译
- 不要删除英文 key
- 不要只改中文文件不改英文文件

检查重点：

- 有没有丢失新增 key
- 有没有把中文值回退成英文
- 有没有把“智能体”等术语改回不一致状态

### 6.2 页面组件

处理方式：

- 优先接收上游布局和业务逻辑
- 再重新挂上 `useTranslation()`
- 尽量复用现有 key，不要重新发明一套
- 如果只是少量新文案，先接受英文 fallback，也不要重写整个页面

错误做法：

- 为了保住中文，直接整文件保留旧版页面

### 6.3 品牌文案

处理方式：

- 仅在用户可见层重新应用 `Penclip`
- 保持技术标识仍为 `paperclip`

判断标准：

- 用户看到的名称：Penclip
- 代码里的技术标识：paperclip

### 6.4 包管理文件

处理方式：

- 合并 dependency 变更
- 保持 package name 不变
- 不要把仓库/包名改成 `penclip`

锁文件策略：

- 按仓库规则，不要在 PR 里提交 `pnpm-lock.yaml`
- 如果同步过程中 lockfile 变了，通常在提交前恢复掉，由 CI 负责

### 6.5 Windows 脚本

如果上游重新改动了 scripts：

- 保留上游新的脚本结构
- 再把 Windows 兼容层补回去
- 不要把已经验证通过的 Node 跨平台脚本退回 `rm/cp/chmod/bash`

## 7. 术语回归清单

每次合并后，优先检查这些高频术语有没有被冲回去：

| 英文 | 正确中文 |
|---|---|
| Agent | 智能体 |
| Issue | 任务 |
| Routine | 例行任务 |
| Run | 运行 |
| Workspace | 工作区 |
| Costs | 成本 |
| Dashboard | 仪表盘 |
| Org | 组织 |

额外检查：

- `CEO` 不翻译
- `Onboarding` 不翻译
- 外部插件名不翻译

## 8. 推荐合并顺序

发生大量冲突时，按这个顺序处理最稳：

1. package / build / server 基础设施
2. shared types 和 API 合同
3. i18n 基础设施
4. locale JSON
5. 共享组件
6. 页面级改动
7. README 和文档

原因是前面的层一旦定下来，后面的页面冲突会更容易判断。

## 9. 合并后的验证步骤

### 9.1 必跑命令

```sh
pnpm -r typecheck
pnpm build
```

如果环境允许，也建议再跑：

```sh
pnpm test:run
```

如果测试因为既有 Windows / 本机环境问题失败，要在提交说明里明确写清楚，不要含糊带过。

### 9.2 页面烟雾验证

至少打开这些页面：

- `/TES/dashboard`
- `/TES/onboarding`
- `/TES/costs`
- `/instance/settings/general`
- `/instance/settings/plugins`

优先确认：

- 默认语言仍然是中文
- 语言切换器仍可用
- 高可见导航仍是中文
- 没有明显把 `Agent` 冲回英文

### 9.3 Playwright 复验建议

如果这次同步改动到了 UI 高 churn 区域，建议用 Playwright 至少做一遍：

- dashboard
- onboarding
- issue detail
- costs
- plugin manager

## 10. 常见错误

### 10.1 误把技术标识也改成 Penclip

错误示例：

- 改 package name
- 改 CLI 名
- 改环境变量名

正确做法：

- 只改用户能看到的品牌文案

### 10.2 为了保住中文，整文件保留旧版页面

后果：

- 错过上游 bugfix
- 下次更难合并

正确做法：

- 接收上游结构，重新补最小 i18n 补丁

### 10.3 只改中文 locale，不改英文 locale

后果：

- 英文模式缺 key
- fallback 行为异常

正确做法：

- 中英文一起改

### 10.4 把用户内容误当成漏翻

不要把这些算作需要修的翻译问题：

- 模型生成正文
- 评论正文
- 日志输出
- 外部插件名称
- 用户输入名称

## 11. 推荐提交策略

同步上游后，尽量拆成两类提交：

### 11.1 上游同步提交

只包含：

- 上游代码进入
- 必要冲突解决

### 11.2 Penclip 重新收口提交

只包含：

- 品牌修复
- 本地化修复
- Windows 兼容重新补齐

这样后续看历史时会清楚得多，也更容易回滚和复盘。

## 12. 快速操作模板

```sh
git checkout master
git pull --ff-only
git checkout -b codex/upstream-sync-YYYYMMDD
git fetch origin
git merge origin/master
```

冲突处理后：

```sh
pnpm -r typecheck
pnpm build
```

再做页面烟雾验证，然后提交。

## 13. 最后的判断标准

一次上游同步处理得是否正确，不看“冲突解决得有多快”，而看这三件事是否同时成立：

1. 上游结构和 bugfix 没丢
2. Penclip 的中文增强和品牌边界没丢
3. 下次再同步时，冲突没有因为这次处理方式而变得更糟

如果三者都成立，这次同步就是成功的。
