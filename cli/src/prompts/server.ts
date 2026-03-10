import * as p from "@clack/prompts";
import type { AuthConfig, ServerConfig } from "../config/schema.js";
import { parseHostnameCsv } from "../config/hostnames.js";

export async function promptServer(opts?: {
  currentServer?: Partial<ServerConfig>;
  currentAuth?: Partial<AuthConfig>;
}): Promise<{ server: ServerConfig; auth: AuthConfig }> {
  const currentServer = opts?.currentServer;
  const currentAuth = opts?.currentAuth;

  const deploymentModeSelection = await p.select({
    message: "部署模式",
    options: [
      {
        value: "local_trusted",
        label: "本地可信",
        hint: "最适合本地开发（无需登录，仅 localhost）",
      },
      {
        value: "authenticated",
        label: "鉴权模式",
        hint: "需要登录，适用于私有网络或公网部署",
      },
    ],
    initialValue: currentServer?.deploymentMode ?? "local_trusted",
  });

  if (p.isCancel(deploymentModeSelection)) {
    p.cancel("已取消设置。");
    process.exit(0);
  }
  const deploymentMode = deploymentModeSelection as ServerConfig["deploymentMode"];

  let exposure: ServerConfig["exposure"] = "private";
  if (deploymentMode === "authenticated") {
    const exposureSelection = await p.select({
      message: "暴露级别",
      options: [
        {
          value: "private",
          label: "私有网络",
          hint: "私网访问（例如 Tailscale），接入门槛更低",
        },
        {
          value: "public",
          label: "公网",
          hint: "对外网暴露，安全要求更高",
        },
      ],
      initialValue: currentServer?.exposure ?? "private",
    });
    if (p.isCancel(exposureSelection)) {
      p.cancel("已取消设置。");
      process.exit(0);
    }
    exposure = exposureSelection as ServerConfig["exposure"];
  }

  const hostDefault = deploymentMode === "local_trusted" ? "127.0.0.1" : "0.0.0.0";
  const hostStr = await p.text({
    message: "绑定主机",
    defaultValue: currentServer?.host ?? hostDefault,
    placeholder: hostDefault,
    validate: (val) => {
      if (!val.trim()) return "主机地址不能为空";
    },
  });

  if (p.isCancel(hostStr)) {
    p.cancel("已取消设置。");
    process.exit(0);
  }

  const portStr = await p.text({
    message: "服务端口",
    defaultValue: String(currentServer?.port ?? 3100),
    placeholder: "3100",
    validate: (val) => {
      const n = Number(val);
      if (isNaN(n) || n < 1 || n > 65535 || !Number.isInteger(n)) {
        return "必须是 1 到 65535 的整数";
      }
    },
  });

  if (p.isCancel(portStr)) {
    p.cancel("已取消设置。");
    process.exit(0);
  }

  let allowedHostnames: string[] = [];
  if (deploymentMode === "authenticated" && exposure === "private") {
    const allowedHostnamesInput = await p.text({
      message: "允许访问的主机名（逗号分隔，可选）",
      defaultValue: (currentServer?.allowedHostnames ?? []).join(", "),
      placeholder: "dotta-macbook-pro, your-host.tailnet.ts.net",
      validate: (val) => {
        try {
          parseHostnameCsv(val);
          return;
        } catch (err) {
          return err instanceof Error ? err.message : "主机名列表不合法";
        }
      },
    });

    if (p.isCancel(allowedHostnamesInput)) {
      p.cancel("已取消设置。");
      process.exit(0);
    }
    allowedHostnames = parseHostnameCsv(allowedHostnamesInput);
  }

  const port = Number(portStr) || 3100;
  const disableSignUp = currentAuth?.disableSignUp ?? false;
  let auth: AuthConfig = { baseUrlMode: "auto", disableSignUp };
  if (deploymentMode === "authenticated" && exposure === "public") {
    const urlInput = await p.text({
      message: "公网访问地址（Base URL）",
      defaultValue: currentAuth?.publicBaseUrl ?? "",
      placeholder: "https://paperclip.example.com",
      validate: (val) => {
        const candidate = val.trim();
        if (!candidate) return "公网模式必须填写 Base URL";
        try {
          const url = new URL(candidate);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "URL 必须以 http:// 或 https:// 开头";
          }
          return;
        } catch {
          return "请输入合法的 URL";
        }
      },
    });
    if (p.isCancel(urlInput)) {
      p.cancel("已取消设置。");
      process.exit(0);
    }
    auth = {
      baseUrlMode: "explicit",
      publicBaseUrl: urlInput.trim().replace(/\/+$/, ""),
      disableSignUp,
    };
  } else if (currentAuth?.baseUrlMode === "explicit" && currentAuth.publicBaseUrl) {
    auth = {
      baseUrlMode: "explicit",
      publicBaseUrl: currentAuth.publicBaseUrl,
      disableSignUp,
    };
  }

  return {
    server: {
      deploymentMode,
      exposure,
      host: hostStr.trim(),
      port,
      allowedHostnames,
      serveUi: currentServer?.serveUi ?? true,
    },
    auth,
  };
}
