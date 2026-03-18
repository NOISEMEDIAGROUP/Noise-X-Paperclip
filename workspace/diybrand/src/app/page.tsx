import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";

const steps = [
  {
    number: "1",
    title: "Answer a few questions",
    description:
      "Tell us about your business, audience, and vibe in under 2 minutes.",
  },
  {
    number: "2",
    title: "AI generates your brand",
    description:
      "Get a logo, color palette, typography, and brand guidelines — instantly.",
  },
  {
    number: "3",
    title: "Download your kit",
    description:
      "Export everything you need: logo files, style guide, and social templates.",
  },
];

const features = [
  {
    title: "Logo & identity",
    description:
      "A unique logo with variations for every context — dark, light, icon, full.",
  },
  {
    title: "Color palette",
    description:
      "A harmonious palette with primary, secondary, and accent colors ready for web and print.",
  },
  {
    title: "Typography",
    description: "Curated font pairings that match your brand personality.",
  },
  {
    title: "Brand guidelines",
    description:
      "A shareable style guide so your brand stays consistent everywhere.",
  },
  {
    title: "Social templates",
    description:
      "Ready-to-use templates for Instagram, Twitter, LinkedIn, and more.",
  },
  {
    title: "Export everything",
    description:
      "Download SVG, PNG, PDF — all the formats you need, no designer required.",
  },
];

const sampleBrands = [
  {
    name: "Bloom & Root",
    industry: "Organic Skincare",
    palette: ["#2D5016", "#8FBC6B", "#F5E6D3", "#1A1A1A", "#FFFFFF"],
    headingFont: "Playfair Display",
    bodyFont: "Source Sans Pro",
    personality: ["Organic", "Warm", "Elegant"],
  },
  {
    name: "Vektora",
    industry: "Tech Startup",
    palette: ["#6366F1", "#22D3EE", "#F8FAFC", "#0F172A", "#E2E8F0"],
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    personality: ["Modern", "Bold", "Innovative"],
  },
  {
    name: "Maple & Co",
    industry: "Coffee Shop",
    palette: ["#92400E", "#D97706", "#FEF3C7", "#1C1917", "#FAFAF9"],
    headingFont: "DM Serif Display",
    bodyFont: "Nunito",
    personality: ["Warm", "Rustic", "Friendly"],
  },
];

const testimonials = [
  {
    quote:
      "I spent weeks going back and forth with a designer. diybrand gave me a brand kit I actually loved in 10 minutes.",
    name: "Sarah M.",
    role: "Freelance Photographer",
  },
  {
    quote:
      "The color palette alone was worth it. Everything feels cohesive now — my website, my socials, my business cards.",
    name: "James K.",
    role: "Personal Trainer",
  },
  {
    quote:
      "I was skeptical about AI-generated branding, but the quality blew me away. My clients think I hired an agency.",
    name: "Priya D.",
    role: "Etsy Shop Owner",
  },
];

const pricingTiers = [
  {
    name: "Basic",
    price: "$19",
    features: [
      "Logo files (PNG)",
      "Color palette (CSS, JSON, HTML)",
      "Typography guide",
    ],
  },
  {
    name: "Premium",
    price: "$49",
    popular: true,
    features: [
      "Everything in Basic",
      "Social media templates",
      "Business card mockup",
    ],
  },
];

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center sm:pt-32 sm:pb-24">
        <p className="mb-4 inline-block rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700">
          Free during early access
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Build your brand in minutes,{" "}
          <span className="text-violet-600">not months</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gray-600 sm:text-xl">
          Answer a short questionnaire and let AI create your complete brand
          identity — logo, colors, fonts, and guidelines — ready to use.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/questionnaire"
            className="inline-flex items-center rounded-lg bg-violet-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800"
          >
            Start building your brand
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <span className="text-sm text-gray-400">
            No credit card required
          </span>
        </div>
        <div className="mt-6 flex w-full justify-center">
          <WaitlistForm />
        </div>
      </section>

      {/* Sample brand kits */}
      <section className="bg-gray-50 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            See what you&apos;ll get
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Real brand kits generated by diybrand.app — yours will be just as
            polished.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-8 md:grid-cols-3">
          {sampleBrands.map((brand) => (
            <div
              key={brand.name}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              {/* Color strip */}
              <div className="flex h-3">
                {brand.palette.map((color) => (
                  <div
                    key={color}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="p-6">
                {/* Logo placeholder */}
                <div
                  className="flex h-20 items-center justify-center rounded-lg"
                  style={{ backgroundColor: brand.palette[2] }}
                >
                  <span
                    className="text-2xl font-bold"
                    style={{
                      color: brand.palette[0],
                      fontFamily: `${brand.headingFont}, serif`,
                    }}
                  >
                    {brand.name}
                  </span>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                  {brand.industry}
                </p>

                {/* Palette swatches */}
                <div className="mt-3 flex gap-1.5">
                  {brand.palette.map((color) => (
                    <div
                      key={color}
                      className="h-8 w-8 rounded-md ring-1 ring-gray-200"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Typography */}
                <div className="mt-4 space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium text-gray-900">Heading:</span>{" "}
                    {brand.headingFont}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Body:</span>{" "}
                    {brand.bodyFont}
                  </p>
                </div>

                {/* Personality tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {brand.personality.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/questionnaire"
            className="text-base font-semibold text-violet-600 underline-offset-4 hover:underline"
          >
            Create yours now &rarr;
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-4 text-lg text-gray-600">
            Three simple steps from idea to brand kit.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-xl font-bold text-white">
                {step.number}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Everything you need to launch
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            A complete brand kit, generated in seconds.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Loved by small business owners
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join hundreds of founders who built their brand with diybrand.app.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Star rating */}
              <div className="flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-4 text-gray-700">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-gray-50 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            One-time purchase. No subscriptions. No hidden fees.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-2xl gap-6 sm:grid-cols-2">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border-2 bg-white p-8 ${
                tier.popular
                  ? "border-violet-600 shadow-lg"
                  : "border-gray-200"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
              <p className="mt-2 text-4xl font-bold text-gray-900">
                {tier.price}
                <span className="text-sm font-normal text-gray-500">
                  {" "}
                  one-time
                </span>
              </p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500">
          You only pay after reviewing your generated brand kit.
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="bg-violet-600 px-6 py-20 text-center text-white sm:py-28">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to build your brand?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-violet-100">
          Start the questionnaire and get your complete brand kit in minutes —
          no design skills needed.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/questionnaire"
            className="inline-flex items-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-violet-700 transition-colors hover:bg-violet-50 active:bg-violet-100"
          >
            Start building your brand
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <span className="text-sm text-violet-200">or</span>
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} diybrand.app. All rights reserved.
      </footer>
    </main>
  );
}
