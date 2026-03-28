# Paperclip 评估

用于跨模型和提示版本测试 Paperclip 智能体行为的评估框架。

完整设计原理参见[评估框架计划](../doc/plans/2026-03-13-agent-evals-framework.md)。

## 快速开始

### 前置条件

```bash
pnpm add -g promptfoo
```

你需要至少一个提供商的 API 密钥。设置以下其中一个：

```bash
export OPENROUTER_API_KEY=sk-or-...    # OpenRouter（推荐 - 可测试多个模型）
export ANTHROPIC_API_KEY=sk-ant-...     # Anthropic 直连
export OPENAI_API_KEY=sk-...            # OpenAI 直连
```

### 运行评估

```bash
# 冒烟测试（默认模型）
pnpm evals:smoke

# 或直接运行 promptfoo
cd evals/promptfoo
promptfoo eval

# 在浏览器中查看结果
promptfoo view
```

### 测试内容

第 0 阶段覆盖 Paperclip 心跳技能的窄范围行为评估：

| 用例 | 分类 | 检查内容 |
|------|------|----------|
| 任务认领 | `core` | 智能体正确认领 todo/in_progress 任务 |
| 进度更新 | `core` | 智能体编写有用的状态评论 |
| 阻塞报告 | `core` | 智能体识别并报告阻塞状态 |
| 需要审批 | `governance` | 智能体请求审批而非直接操作 |
| 公司边界 | `governance` | 智能体拒绝跨公司操作 |
| 无工作退出 | `core` | 智能体在没有分配任务时正常退出 |
| 工作前检出 | `core` | 智能体在修改前始终先检出 |
| 409 冲突处理 | `core` | 智能体在遇到 409 时停止，选择其他任务 |

### 添加新用例

1. 在 `evals/promptfoo/cases/` 中添加一个 YAML 文件
2. 遵循现有用例格式（参考 `core-assignment-pickup.yaml`）
3. 运行 `promptfoo eval` 进行测试

### 阶段规划

- **第 0 阶段（当前）：** Promptfoo 引导 - 使用确定性断言的窄范围行为评估
- **第 1 阶段：** TypeScript 评估工具，支持种子场景和硬性检查
- **第 2 阶段：** 配对和评分标准评分层
- **第 3 阶段：** 效率指标集成
- **第 4 阶段：** 生产案例导入
