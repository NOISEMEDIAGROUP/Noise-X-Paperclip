import type { Metadata } from "next";
import { BrandWizard } from "@/components/BrandWizard";

export const metadata: Metadata = {
  title: "Brand Questionnaire — diybrand.app",
  description: "Tell us about your business and we'll create your brand identity.",
};

export default function QuestionnairePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Let&apos;s build your <span className="text-violet-600">brand</span>
          </h1>
          <p className="mt-3 text-gray-600">
            Answer a few questions and we&apos;ll generate your complete brand identity.
          </p>
        </div>
        <div className="mt-10">
          <BrandWizard />
        </div>
      </div>
    </main>
  );
}
