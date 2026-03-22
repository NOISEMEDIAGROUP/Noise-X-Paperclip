import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "../context/ThemeContext";

export function MermaidBlock({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "-");
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "strict",
    });

    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }: { svg: string }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render Mermaid diagram");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id, theme]);

  if (error) {
    return <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{chart}</pre>;
  }

  if (!svg) {
    return <div className="text-xs text-muted-foreground">Rendering diagram…</div>;
  }

  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}
