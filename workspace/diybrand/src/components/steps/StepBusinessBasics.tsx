import type { QuestionnaireData } from "../BrandWizard";

type Props = {
  data: QuestionnaireData;
  updateData: (partial: Partial<QuestionnaireData>) => void;
  errors: Record<string, string>;
};

const INDUSTRIES = [
  "Technology",
  "E-commerce",
  "Food & Beverage",
  "Health & Wellness",
  "Education",
  "Finance",
  "Creative & Design",
  "Real Estate",
  "Fashion & Apparel",
  "Travel & Hospitality",
  "Entertainment",
  "Consulting",
  "Non-profit",
  "Other",
];

export function StepBusinessBasics({ data, updateData, errors }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-900">
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          value={data.businessName}
          onChange={(e) => updateData({ businessName: e.target.value })}
          placeholder="e.g. Sunrise Coffee Co."
          className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.businessName ? "border-red-300" : "border-gray-300"
          }`}
        />
        {errors.businessName && (
          <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
        )}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-900">
          Industry
        </label>
        <select
          id="industry"
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.industry ? "border-red-300" : "border-gray-300"
          } ${!data.industry ? "text-gray-400" : ""}`}
        >
          <option value="">Select an industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        {errors.industry && (
          <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
        )}
      </div>

      <div>
        <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-900">
          Describe your business in a few sentences
        </label>
        <textarea
          id="businessDescription"
          value={data.businessDescription}
          onChange={(e) => updateData({ businessDescription: e.target.value })}
          rows={3}
          placeholder="What do you do? What makes you different?"
          className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.businessDescription ? "border-red-300" : "border-gray-300"
          }`}
        />
        {errors.businessDescription && (
          <p className="mt-1 text-sm text-red-600">{errors.businessDescription}</p>
        )}
      </div>
    </div>
  );
}
