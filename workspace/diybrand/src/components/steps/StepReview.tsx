import type { QuestionnaireData } from "../BrandWizard";

type Props = {
  data: QuestionnaireData;
};

function ReviewSection({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

export function StepReview({ data }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Review your answers</h3>
        <p className="mt-1 text-sm text-gray-500">
          Make sure everything looks good before submitting. You can go back to edit any step.
        </p>
      </div>

      <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-5 py-1">
        <div className="py-4">
          <ReviewSection label="Business name" value={data.businessName} />
        </div>
        <div className="py-4">
          <ReviewSection label="Industry" value={data.industry} />
        </div>
        <div className="py-4">
          <ReviewSection label="Business description" value={data.businessDescription} />
        </div>
        <div className="py-4">
          <ReviewSection label="Target audience" value={data.targetAudience} />
        </div>
        <div className="py-4">
          <dt className="text-sm font-medium text-gray-500">Brand personality</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {data.brandPersonality.length > 0 ? (
              data.brandPersonality.map((adj) => (
                <span
                  key={adj}
                  className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700"
                >
                  {adj}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-900">—</span>
            )}
          </dd>
        </div>
        <div className="py-4">
          <ReviewSection label="Brands you admire" value={data.competitors} />
        </div>
        <div className="py-4">
          <ReviewSection label="Visual preferences" value={data.visualPreferences} />
        </div>
      </dl>
    </div>
  );
}
