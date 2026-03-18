import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function resolveAllowedHosts(): string[] {
  const hosts = new Set<string>(["cascadia.tail7c7620.ts.net"]);
  const allowedFromEnv = process.env.PAPERCLIP_ALLOWED_HOSTNAMES;
  if (allowedFromEnv) {
    for (const value of allowedFromEnv.split(",")) {
      const normalized = value.trim().toLowerCase();
      if (normalized) hosts.add(normalized);
    }
  }

  const publicUrl = process.env.PAPERCLIP_PUBLIC_URL;
  if (publicUrl) {
    try {
      const hostname = new URL(publicUrl).hostname.trim().toLowerCase();
      if (hostname) hosts.add(hostname);
    } catch {
      // Ignore malformed URLs; Vite just needs the valid hostnames.
    }
  }

  return Array.from(hosts);
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: resolveAllowedHosts(),
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        ws: true,
      },
    },
  },
});
