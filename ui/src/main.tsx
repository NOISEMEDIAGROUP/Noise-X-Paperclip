import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "@/lib/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { CompanyProvider } from "./context/CompanyContext";
import { LiveUpdatesProvider } from "./context/LiveUpdatesProvider";
import { BreadcrumbProvider } from "./context/BreadcrumbContext";
import { PanelProvider } from "./context/PanelContext";
import { SidebarProvider } from "./context/SidebarContext";
import { DialogProvider } from "./context/DialogContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isNetworkErrorLike, networkRetryDelayMs } from "./lib/networkError";
import "@mdxeditor/editor/style.css";
import "./index.css";

const ENABLE_SERVICE_WORKER_IN_PROD = import.meta.env.VITE_ENABLE_SERVICE_WORKER === "true";

async function clearAllCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

function registrationScriptUrls(registration: ServiceWorkerRegistration): string[] {
  return [registration.active?.scriptURL, registration.waiting?.scriptURL, registration.installing?.scriptURL].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function isLegacyServiceWorker(registration: ServiceWorkerRegistration): boolean {
  return registrationScriptUrls(registration).some((url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === "/2sw.js";
    } catch {
      return url.includes("/2sw.js");
    }
  });
}

if ("serviceWorker" in navigator) {
  void (async () => {
    const shouldRegister = import.meta.env.PROD && ENABLE_SERVICE_WORKER_IN_PROD;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const toUnregister = shouldRegister
        ? registrations.filter((registration) => isLegacyServiceWorker(registration))
        : registrations;

      if (toUnregister.length > 0) {
        await Promise.all(toUnregister.map((registration) => registration.unregister()));
        await clearAllCaches();
      }

      if (shouldRegister) {
        await navigator.serviceWorker.register("/sw.js");
      }
    } catch (error) {
      console.error("[paperclip] Failed to reconcile service worker/cache state:", error);
    }
  })();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => isNetworkErrorLike(error) && failureCount < 8,
      retryDelay: (attempt) => networkRetryDelayMs(attempt),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CompanyProvider>
          <ToastProvider>
            <LiveUpdatesProvider>
              <BrowserRouter>
                <TooltipProvider>
                  <BreadcrumbProvider>
                    <SidebarProvider>
                      <PanelProvider>
                        <DialogProvider>
                          <App />
                        </DialogProvider>
                      </PanelProvider>
                    </SidebarProvider>
                  </BreadcrumbProvider>
                </TooltipProvider>
              </BrowserRouter>
            </LiveUpdatesProvider>
          </ToastProvider>
        </CompanyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
