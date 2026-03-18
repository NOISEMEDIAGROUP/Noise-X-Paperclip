import type { QuestionnaireData } from "../BrandWizard";

type Props = {
  data: QuestionnaireData;
  updateData: (partial: Partial<QuestionnaireData>) => void;
  errors: Record<string, string>;
};

const ADJECTIVES = [
  "Bold",
  "Playful",
  "Elegant",
  "Minimal",
  "Warm",
  "Trustworthy",
  "Innovative",
  "Edgy",
  "Friendly",
  "Luxurious",
  "Rustic",
  "Modern",
  "Classic",
  "Energetic",
  "Calm",
  "Professional",
  "Quirky",
  "Sophisticated",
  "Organic",
  "Techy",
];

export function StepBrandPersonality({ data, updateData, errors }: Props) {
  const toggle = (adj: string) => {
    const current = data.brandPersonality;
    if (current.includes(adj)) {
      updateData({ brandPersonality: current.filter((a) => a !== adj) });
    } else if (current.length < 5) {
      updateData({ brandPersonality: [...current, adj] });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Brand personality</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select 3 to 5 adjectives that best describe how your brand should feel.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Brand personality adjectives">
        {ADJECTIVES.map((adj) => {
          const selected = data.brandPersonality.includes(adj);
          return (
            <button
              key={adj}
              type="button"
              onClick={() => toggle(adj)}
              aria-pressed={selected}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              {selected ? `✓ ${adj}` : adj}
            </button>
          );
        })}
      </div>

      {errors.brandPersonality && (
        <p className="text-sm text-red-600" role="alert">{errors.brandPersonality}</p>
      )}

      {data.brandPersonality.length > 0 && (
        <p className="text-sm text-gray-500">
          Selected: {data.brandPersonality.join(", ")} ({data.brandPersonality.length}/5)
        </p>
      )}
    </div>
  );
}
