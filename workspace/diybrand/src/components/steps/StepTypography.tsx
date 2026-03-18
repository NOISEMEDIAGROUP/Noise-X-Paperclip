"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type FontInfo = {
  family: string;
  weight: number;
  category: string;
};

type TypographyOption = {
  id: string;
  name: string;
  heading: FontInfo;
  body: FontInfo;
};

type Props = {
  questionnaireId: string;
  onComplete: () => void;
};

function googleFontsUrl(pairs: TypographyOption[]): string {
  const families = new Set<string>();
  for (const pair of pairs) {
    families.add(
      `family=${encodeURIComponent(pair.heading.family)}:wght@${pair.heading.weight}`
    );
    families.add(
      `family=${encodeURIComponent(pair.body.family)}:wght@${pair.body.weight}`
    );
  }
  return `https://fonts.googleapis.com/css2?${[...families].join("&")}&display=swap`;
}

export function StepTypography({ questionnaireId, onComplete }: Props) {
  const [pairs, setPairs] = useState<TypographyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const generateCalled = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/typography", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionnaireId }),
      });
      if (!res.ok) throw new Error("Failed to generate typography pairs");
      const data = await res.json();
      setPairs(data.pairs);

      // Load Google Fonts
      if (data.pairs.length > 0) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = googleFontsUrl(data.pairs);
        link.onload = () => setFontsLoaded(true);
        document.head.appendChild(link);
      }
    } catch {
      setError("Could not generate typography pairs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    if (generateCalled.current) return;
    generateCalled.current = true;
    generate();
  }, [generate]);

  const handleSelect = useCallback(
    async (typographyId: string) => {
      setSelectedId(typographyId);
      setSaving(true);
      try {
        const res = await fetch("/api/typography/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typographyId, questionnaireId }),
        });
        if (!res.ok) throw new Error("Failed to save selection");
      } catch {
        setError("Could not save selection.");
      } finally {
        setSaving(false);
      }
    },
    [questionnaireId]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16" role="status" aria-busy="true" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" aria-hidden="true" />
        <p className="mt-4 text-sm text-gray-500">Finding the perfect font pairs...</p>
      </div>
    );
  }

  if (error && pairs.length === 0) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center" role="alert">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            generateCalled.current = false;
            generate();
          }}
          className="mt-4 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const selectedPair = pairs.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Choose your typography</h3>
        <p className="mt-1 text-sm text-gray-500">
          We paired heading and body fonts based on your brand personality.
          Pick the combination that feels right.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3" role="radiogroup" aria-label="Typography options">
        {pairs.map((pair) => {
          const isSelected = selectedId === pair.id;
          return (
            <button
              key={pair.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${pair.name}: ${pair.heading.family} heading with ${pair.body.family} body${isSelected ? " (selected)" : ""}`}
              onClick={() => handleSelect(pair.id)}
              className={`group rounded-xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? "border-violet-600 ring-2 ring-violet-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {pair.name}
                </span>
                {isSelected && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    ✓ Selected
                  </span>
                )}
              </div>

              {/* Font preview */}
              <div
                className="rounded-lg bg-gray-50 p-4"
                style={{ opacity: fontsLoaded ? 1 : 0.6, transition: "opacity 0.3s" }}
              >
                <p
                  className="text-2xl leading-tight text-gray-900"
                  style={{
                    fontFamily: `"${pair.heading.family}", ${pair.heading.category}`,
                    fontWeight: pair.heading.weight,
                  }}
                >
                  The quick brown fox
                </p>
                <p
                  className="mt-2 text-sm leading-relaxed text-gray-600"
                  style={{
                    fontFamily: `"${pair.body.family}", ${pair.body.category}`,
                    fontWeight: pair.body.weight,
                  }}
                >
                  Pack my box with five dozen liquor jugs. The quick brown fox
                  jumps over the lazy dog near the riverbank.
                </p>
              </div>

              {/* Font details */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-block w-14 font-medium text-gray-700">Heading</span>
                  <span>{pair.heading.family}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pair.heading.weight}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pair.heading.category}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-block w-14 font-medium text-gray-700">Body</span>
                  <span>{pair.body.family}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pair.body.weight}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pair.body.category}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="sr-only">
        {selectedPair ? `Selected typography: ${selectedPair.name}` : ""}
      </div>

      {error && pairs.length > 0 && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      {selectedId && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue with this typography"}
          </button>
        </div>
      )}
    </div>
  );
}
