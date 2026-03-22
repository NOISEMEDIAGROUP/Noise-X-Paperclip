// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const invalidateQueries = vi.fn();
const navigate = vi.fn();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authPageSource = fs.readFileSync(path.resolve(__dirname, "Auth.tsx"), "utf8");

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useQuery: () => ({ data: null, isLoading: false }),
  useMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock("../api/auth", () => ({
  authApi: {
    getSession: vi.fn(),
    signInEmail: vi.fn(),
    signUpEmail: vi.fn(),
  },
}));

vi.mock("../components/AsciiArtAnimation", () => ({
  AsciiArtAnimation: () => <div data-testid="ascii-art" />,
}));

import { AuthPage } from "./Auth";

describe("AuthPage", () => {
  it("keeps mobile-first responsive spacing on the form pane", () => {
    const html = renderToStaticMarkup(<AuthPage />);

    expect(html).toContain("w-full md:w-1/2 flex flex-col overflow-y-auto");
    expect(html).toContain("px-4 sm:px-6 md:px-8 py-8 sm:py-12");
    expect(html).toContain("hidden md:block w-1/2 overflow-hidden");
    expect(html).toContain('for="auth-email"');
    expect(html).toContain('id="auth-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('inputMode="email"');
    expect(html).toContain('autoCapitalize="none"');
    expect(html).toContain('for="auth-password"');
    expect(html).toContain('id="auth-password"');
    expect(html).toContain('name="password"');
    const requiredAttributes = html.match(/required=""/g) ?? [];
    expect(requiredAttributes.length).toBeGreaterThanOrEqual(2);
  });

  it("announces authentication errors to assistive technologies", () => {
    expect(authPageSource).toContain('id="auth-error"');
    expect(authPageSource).toContain('role="alert"');
    expect(authPageSource).toContain('aria-live="polite"');
    expect(authPageSource).toContain('aria-describedby={error ? "auth-error" : undefined}');
    expect(authPageSource).toContain('aria-invalid={Boolean(error)}');
  });
});
