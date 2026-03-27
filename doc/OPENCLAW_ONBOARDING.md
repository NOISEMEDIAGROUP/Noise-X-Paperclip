请使用以下检查清单。

1. 以认证模式启动 Paperclip。
```bash
cd <paperclip-repo-root>
pnpm dev --tailscale-auth
```
然后验证：
```bash
curl -sS http://127.0.0.1:3100/api/health | jq
```

2. 启动一个全新/默认的 OpenClaw Docker。
```bash
OPENCLAW_RESET_STATE=1 OPENCLAW_BUILD=1 ./scripts/smoke/openclaw-docker-ui.sh
```
在浏览器中打开输出的 `Dashboard URL`（包含 `#token=...`）。

3. 在 Paperclip UI 中，访问 `http://127.0.0.1:3100/CLA/company/settings`。

4. 使用 OpenClaw 邀请提示流程。
- 在"邀请"部分，点击 `Generate OpenClaw Invite Prompt`。
- 从 `OpenClaw Invite Prompt` 复制生成的提示。
- 将其作为一条消息粘贴到 OpenClaw 主聊天中。
- 如果卡住了，发送一条跟进消息：`How is onboarding going? Continue setup now.`

安全/控制说明：
- OpenClaw 邀请提示通过受控端点创建：
  - `POST /api/companies/{companyId}/openclaw/invite-prompt`
  - 具有邀请权限的董事会用户可以调用
  - 代理调用者仅限公司 CEO 代理

5. 在 Paperclip UI 中批准加入请求，然后确认 OpenClaw 代理出现在 CLA 代理列表中。

6. 网关预检（任务测试前必需）。
- 确认创建的代理使用 `openclaw_gateway`（不是 `openclaw`）。
- 确认网关 URL 是 `ws://...` 或 `wss://...`。
- 确认网关 token 不是简单值（非空/非单字符占位符）。
- OpenClaw Gateway 适配器 UI 在正常入门流程中不应暴露 `disableDeviceAuth`。
- 确认配对模式是显式的：
  - 必须的默认值：设备认证已启用（`adapterConfig.disableDeviceAuth` 为 false/未设置）且已持久化 `adapterConfig.devicePrivateKeyPem`
  - 正常入门流程中不要依赖 `disableDeviceAuth`
- 如果你能使用董事会认证运行 API 检查：
```bash
AGENT_ID="<newly-created-agent-id>"
curl -sS -H "Cookie: $PAPERCLIP_COOKIE" "http://127.0.0.1:3100/api/agents/$AGENT_ID" | jq '{adapterType,adapterConfig:{url:.adapterConfig.url,tokenLen:(.adapterConfig.headers["x-openclaw-token"] // .adapterConfig.headers["x-openclaw-auth"] // "" | length),disableDeviceAuth:(.adapterConfig.disableDeviceAuth // false),hasDeviceKey:(.adapterConfig.devicePrivateKeyPem // "" | length > 0)}}'
```
- 预期结果：`adapterType=openclaw_gateway`、`tokenLen >= 16`、`hasDeviceKey=true`、`disableDeviceAuth=false`。

配对握手说明：
- 干净运行的预期：首次任务应该无需手动配对命令即可成功。
- 适配器在首次收到 `pairing required` 时会尝试一次自动配对批准 + 重试（当共享网关认证 token/密码有效时）。
- 如果自动配对无法完成（例如 token 不匹配或没有待处理的请求），首次网关运行可能仍会返回 `pairing required`。
- 这与 Paperclip 邀请批准是分开的。你必须在 OpenClaw 本身中批准待处理的设备。
- 在 OpenClaw 中批准后，重试任务。
- 对于本地 docker 冒烟测试，你可以从主机批准：
```bash
docker exec openclaw-docker-openclaw-gateway-1 sh -lc 'openclaw devices approve --latest --json --url "ws://127.0.0.1:18789" --token "$(node -p \"require(process.env.HOME+\\\"/.openclaw/openclaw.json\\\").gateway.auth.token\")"'
```
- 你可以检查待处理与已配对的设备：
```bash
docker exec openclaw-docker-openclaw-gateway-1 sh -lc 'TOK="$(node -e \"const fs=require(\\\"fs\\\");const c=JSON.parse(fs.readFileSync(\\\"/home/node/.openclaw/openclaw.json\\\",\\\"utf8\\\"));process.stdout.write(c.gateway?.auth?.token||\\\"\\\");\")\"; openclaw devices list --json --url \"ws://127.0.0.1:18789\" --token \"$TOK\"'
```

7. 案例 A（手动议题测试）。
- 创建一个分配给 OpenClaw 代理的议题。
- 添加指令："post comment `OPENCLAW_CASE_A_OK_<timestamp>` and mark done."
- 在 UI 中验证：议题状态变为 `done` 且评论存在。

8. 案例 B（消息工具测试）。
- 创建另一个分配给 OpenClaw 的议题。
- 指令："send `OPENCLAW_CASE_B_OK_<timestamp>` to main webchat via message tool, then comment same marker on issue, then mark done."
- 验证两项：
  - 议题上的标记评论
  - 标记文本出现在 OpenClaw 主聊天中

9. 案例 C（新会话记忆/技能测试）。
- 在 OpenClaw 中，启动 `/new` 会话。
- 要求它在 Paperclip 中创建一个具有唯一标题 `OPENCLAW_CASE_C_CREATED_<timestamp>` 的新 CLA 议题。
- 在 Paperclip UI 中验证新议题是否存在。

10. 测试期间查看日志（可选但有帮助）：
```bash
docker compose -f /tmp/openclaw-docker/docker-compose.yml -f /tmp/openclaw-docker/.paperclip-openclaw.override.yml logs -f openclaw-gateway
```

11. 预期通过标准。
- 预检：`openclaw_gateway` + 非占位符 token（`tokenLen >= 16`）。
- 配对模式：已配置稳定的 `devicePrivateKeyPem` 且设备认证已启用（默认路径）。
- 案例 A：`done` + 标记评论。
- 案例 B：`done` + 标记评论 + 主聊天消息可见。
- 案例 C：原始任务完成且从 `/new` 会话创建了新议题。

如果需要，我还可以提供一个"观察模式"命令，在你通过 UI 实时观看相同步骤的同时运行默认冒烟测试套件。
