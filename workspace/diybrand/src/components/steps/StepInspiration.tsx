import type { QuestionnaireData } from "../BrandWizard";

type Props = {
  data: QuestionnaireData;
  updateData: (partial: Partial<QuestionnaireData>) => void;
};

export function StepInspiration({ data, updateData }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Inspiration</h3>
        <p className="mt-1 text-sm text-gray-500">
          These are optional but help us generate a better brand for you.
        </p>
      </div>

      <div>
        <label htmlFor="competitors" className="block text-sm font-medium text-gray-900">
          Brands or competitors you admire
        </label>
        <textarea
          id="competitors"
          value={data.competitors}
          onChange={(e) => updateData({ competitors: e.target.value })}
          rows={3}
          placeholder="e.g. I love the simplicity of Apple, the warmth of Mailchimp, and the boldness of Nike."
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label htmlFor="visualPreferences" className="block text-sm font-medium text-gray-900">
          Visual preferences
        </label>
        <textarea
          id="visualPreferences"
          value={data.visualPreferences}
          onChange={(e) => updateData({ visualPreferences: e.target.value })}
          rows={3}
          placeholder="e.g. I prefer clean, minimal designs with lots of whitespace. Earthy tones over bright neons. Serif fonts for headings."
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>
    </div>
  );
}
