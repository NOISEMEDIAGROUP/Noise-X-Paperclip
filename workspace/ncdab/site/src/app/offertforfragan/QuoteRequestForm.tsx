"use client";

import { useState, useCallback } from "react";

type FormData = {
  // Step 1 — Project details
  serviceType: string;
  projectDescription: string;
  projectScope: string;
  timeline: string;
  // Step 2 — Contact info
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  howFound: string;
};

const initialFormData: FormData = {
  serviceType: "",
  projectDescription: "",
  projectScope: "",
  timeline: "",
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  howFound: "",
};

const serviceTypes = [
  "BIM-modellering",
  "Byggritningar",
  "Projektledning",
  "Drönarfotografering",
];

const scopeOptions = [
  "Litet (enskild bostad / mindre renovering)",
  "Mellanstort (flerbostadshus / kommersiell lokal)",
  "Stort (infrastruktur / stadsutveckling)",
  "Osäker — behöver rådgivning",
];

const timelineOptions = [
  "Så snart som möjligt",
  "Inom 1–3 månader",
  "Inom 3–6 månader",
  "Mer än 6 månader",
  "Flexibelt",
];

const howFoundOptions = [
  "Google-sökning",
  "Rekommendation",
  "LinkedIn",
  "Mässa / Event",
  "Annat",
];

const TOTAL_STEPS = 3;

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Projektdetaljer" },
    { number: 2, label: "Kontaktuppgifter" },
    { number: 3, label: "Bekräftelse" },
  ];

  return (
    <nav aria-label="Formulärsteg" className="mb-10">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          return (
            <li key={step.number} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary-500 text-white"
                      : isCompleted
                        ? "bg-primary-100 text-primary-600"
                        : "bg-steel-200 text-steel-500"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    isActive ? "text-primary-600" : "text-steel-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-px w-8 sm:w-12 ${
                    isCompleted ? "bg-primary-300" : "bg-steel-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const inputClass =
  "mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";
const labelClass = "block text-sm font-medium text-steel-700";
const requiredMark = <span className="text-accent-500"> *</span>;

function StepProjectDetails({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  errors: Partial<Record<keyof FormData, string>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="serviceType" className={labelClass}>
          Typ av tjänst{requiredMark}
        </label>
        <select
          id="serviceType"
          value={data.serviceType}
          onChange={(e) => onChange("serviceType", e.target.value)}
          className={`${inputClass} ${errors.serviceType ? "border-accent-500" : ""}`}
        >
          <option value="" disabled>
            Välj tjänst
          </option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.serviceType && (
          <p className="mt-1 text-sm text-accent-500">{errors.serviceType}</p>
        )}
      </div>

      <div>
        <label htmlFor="projectDescription" className={labelClass}>
          Projektbeskrivning{requiredMark}
        </label>
        <textarea
          id="projectDescription"
          rows={4}
          value={data.projectDescription}
          onChange={(e) => onChange("projectDescription", e.target.value)}
          className={`${inputClass} ${errors.projectDescription ? "border-accent-500" : ""}`}
          placeholder="Beskriv ert projekt och vad ni behöver hjälp med..."
        />
        {errors.projectDescription && (
          <p className="mt-1 text-sm text-accent-500">
            {errors.projectDescription}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="projectScope" className={labelClass}>
          Uppskattad projektstorlek{requiredMark}
        </label>
        <select
          id="projectScope"
          value={data.projectScope}
          onChange={(e) => onChange("projectScope", e.target.value)}
          className={`${inputClass} ${errors.projectScope ? "border-accent-500" : ""}`}
        >
          <option value="" disabled>
            Välj storlek
          </option>
          {scopeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {errors.projectScope && (
          <p className="mt-1 text-sm text-accent-500">{errors.projectScope}</p>
        )}
      </div>

      <div>
        <label htmlFor="timeline" className={labelClass}>
          Önskad tidsplan{requiredMark}
        </label>
        <select
          id="timeline"
          value={data.timeline}
          onChange={(e) => onChange("timeline", e.target.value)}
          className={`${inputClass} ${errors.timeline ? "border-accent-500" : ""}`}
        >
          <option value="" disabled>
            Välj tidsplan
          </option>
          {timelineOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {errors.timeline && (
          <p className="mt-1 text-sm text-accent-500">{errors.timeline}</p>
        )}
      </div>
    </div>
  );
}

function StepContactInfo({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  errors: Partial<Record<keyof FormData, string>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="companyName" className={labelClass}>
          Företagsnamn{requiredMark}
        </label>
        <input
          type="text"
          id="companyName"
          value={data.companyName}
          onChange={(e) => onChange("companyName", e.target.value)}
          className={`${inputClass} ${errors.companyName ? "border-accent-500" : ""}`}
          placeholder="Företag AB"
        />
        {errors.companyName && (
          <p className="mt-1 text-sm text-accent-500">{errors.companyName}</p>
        )}
      </div>

      <div>
        <label htmlFor="contactPerson" className={labelClass}>
          Kontaktperson{requiredMark}
        </label>
        <input
          type="text"
          id="contactPerson"
          value={data.contactPerson}
          onChange={(e) => onChange("contactPerson", e.target.value)}
          className={`${inputClass} ${errors.contactPerson ? "border-accent-500" : ""}`}
          placeholder="Förnamn Efternamn"
        />
        {errors.contactPerson && (
          <p className="mt-1 text-sm text-accent-500">
            {errors.contactPerson}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          E-post{requiredMark}
        </label>
        <input
          type="email"
          id="email"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          className={`${inputClass} ${errors.email ? "border-accent-500" : ""}`}
          placeholder="namn@foretag.se"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-accent-500">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Telefon{requiredMark}
        </label>
        <input
          type="tel"
          id="phone"
          value={data.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          className={`${inputClass} ${errors.phone ? "border-accent-500" : ""}`}
          placeholder="070-123 45 67"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-accent-500">{errors.phone}</p>
        )}
      </div>

      <div>
        <label htmlFor="howFound" className={labelClass}>
          Hur hittade ni oss?
        </label>
        <select
          id="howFound"
          value={data.howFound}
          onChange={(e) => onChange("howFound", e.target.value)}
          className={inputClass}
        >
          <option value="">Välj alternativ (valfritt)</option>
          {howFoundOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepConfirmation({ data }: { data: FormData }) {
  const summaryItems = [
    { label: "Tjänst", value: data.serviceType },
    { label: "Projektbeskrivning", value: data.projectDescription },
    { label: "Projektstorlek", value: data.projectScope },
    { label: "Tidsplan", value: data.timeline },
    { label: "Företag", value: data.companyName },
    { label: "Kontaktperson", value: data.contactPerson },
    { label: "E-post", value: data.email },
    { label: "Telefon", value: data.phone },
    ...(data.howFound
      ? [{ label: "Hur ni hittade oss", value: data.howFound }]
      : []),
  ];

  return (
    <div>
      <div className="rounded-xl border border-steel-200 bg-steel-50 p-6">
        <h3 className="text-lg font-semibold text-steel-800 mb-4">
          Sammanfattning av er förfrågan
        </h3>
        <dl className="space-y-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4"
            >
              <dt className="text-sm font-medium text-steel-500">
                {item.label}
              </dt>
              <dd className="text-sm text-steel-800 sm:col-span-2 whitespace-pre-wrap">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-4 text-sm text-steel-500">
        Kontrollera att uppgifterna stämmer och klicka sedan på
        &quot;Skicka offertförfrågan&quot; nedan.
      </p>
    </div>
  );
}

function SuccessMessage() {
  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-8 text-center">
      <svg
        className="mx-auto h-14 w-14 text-primary-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
      <h3 className="mt-4 text-xl font-semibold text-steel-800">
        Tack för er offertförfrågan!
      </h3>
      <p className="mt-3 text-steel-500 max-w-md mx-auto">
        Vi har tagit emot era uppgifter och återkommer med en offert inom
        två arbetsdagar. Har ni frågor under tiden? Kontakta oss på{" "}
        <a
          href="mailto:info@ncdab.se"
          className="text-primary-500 hover:text-primary-600 font-medium"
        >
          info@ncdab.se
        </a>
        .
      </p>
    </div>
  );
}

export default function QuoteRequestForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  function validateStep(stepNumber: number): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (stepNumber === 1) {
      if (!formData.serviceType)
        newErrors.serviceType = "Välj en tjänst.";
      if (!formData.projectDescription.trim())
        newErrors.projectDescription = "Beskriv ert projekt.";
      if (!formData.projectScope)
        newErrors.projectScope = "Välj projektstorlek.";
      if (!formData.timeline) newErrors.timeline = "Välj tidsplan.";
    }

    if (stepNumber === 2) {
      if (!formData.companyName.trim())
        newErrors.companyName = "Ange företagsnamn.";
      if (!formData.contactPerson.trim())
        newErrors.contactPerson = "Ange kontaktperson.";
      if (!formData.email.trim()) {
        newErrors.email = "Ange e-postadress.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Ange en giltig e-postadress.";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Ange telefonnummer.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      handleNext();
      return;
    }
    // Log to console as specified (no backend yet)
    console.log("Offertförfrågan skickad:", formData);
    setSubmitted(true);
  }

  if (submitted) {
    return <SuccessMessage />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepIndicator currentStep={step} />

      {step === 1 && (
        <StepProjectDetails
          data={formData}
          onChange={handleChange}
          errors={errors}
        />
      )}
      {step === 2 && (
        <StepContactInfo
          data={formData}
          onChange={handleChange}
          errors={errors}
        />
      )}
      {step === 3 && <StepConfirmation data={formData} />}

      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-md border border-steel-300 bg-white px-5 py-2.5 text-sm font-semibold text-steel-700 shadow-sm hover:bg-steel-50 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Tillbaka
          </button>
        ) : (
          <span />
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
        >
          {step < TOTAL_STEPS ? (
            <>
              Nästa
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </>
          ) : (
            "Skicka offertförfrågan"
          )}
        </button>
      </div>
    </form>
  );
}
