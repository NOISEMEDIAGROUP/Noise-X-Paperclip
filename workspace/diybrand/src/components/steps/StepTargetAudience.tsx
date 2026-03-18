import type { QuestionnaireData } from "../BrandWizard";

type Props = {
  data: QuestionnaireData;
  updateData: (partial: Partial<QuestionnaireData>) => void;
  errors: Record<string, string>;
};

export function StepTargetAudience({ data, updateData, errors }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Who are your customers?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Describe your ideal customer. Think about their age, interests, problems they&apos;re
          trying to solve, and what draws them to your business.
        </p>
      </div>

      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-900">
          Target audience
        </label>
        <textarea
          id="targetAudience"
          value={data.targetAudience}
          onChange={(e) => updateData({ targetAudience: e.target.value })}
          rows={5}
          placeholder="e.g. Young professionals aged 25-35 who care about sustainability and are willing to pay a premium for ethically-sourced coffee. They're active on Instagram and value aesthetics and community."
          aria-invalid={!!errors.targetAudience}
          aria-describedby={errors.targetAudience ? "targetAudience-error" : undefined}
          className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.targetAudience ? "border-red-300" : "border-gray-300"
          }`}
        />
        {errors.targetAudience && (
          <p id="targetAudience-error" className="mt-1 text-sm text-red-600" role="alert">{errors.targetAudience}</p>
        )}
      </div>
    </div>
  );
}
