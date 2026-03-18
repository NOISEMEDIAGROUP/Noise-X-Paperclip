export function CompetitorComparison() {
  const competitors = [
    {
      name: "DIYBrand",
      price: "$19-49",
      period: "one-time",
      features: ["Own all files forever", "No subscriptions", "Commercial rights included"],
      highlight: true,
      color: "var(--primary)",
    },
    {
      name: "Looka",
      price: "$20+",
      period: "one-time",
      features: ["Limited file types", "Basic package only", "Upgrades cost extra"],
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Tailor Brands",
      price: "$10.99",
      period: "/month",
      yearlyNote: "$132/year",
      features: ["Subscription required", "Can't cancel without losing access", "Limited downloads"],
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Canva Pro",
      price: "$120",
      period: "/year",
      features: ["Locked to Canva platform", "No raw files", "Monthly fees forever"],
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Freelance Designer",
      price: "$500-2,000+",
      period: "one-time",
      features: ["Weeks of back-and-forth", "Revisions cost extra", "Hard to find quality talent"],
      highlight: false,
      color: "var(--text-muted)",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {competitors.map((comp, i) => (
          <div
            key={comp.name}
            className={`glass neon-glow relative rounded-2xl p-6 transition-all ${
              comp.highlight
                ? "border-2 border-[var(--primary)]/50 shadow-[0_0_40px_#8b5cf620] scale-105"
                : "border border-[var(--glass-border)]"
            }`}
            style={{
              transform: comp.highlight ? "scale(1.05)" : "scale(1)",
            }}
          >
            {comp.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent-lime)] px-3 py-1 text-xs font-bold text-black shadow-[0_0_20px_#a8ff3e50]">
                Best Value
              </div>
            )}

            <div className="text-center">
              <h3
                className="font-[var(--font-space)] text-lg font-bold"
                style={{ color: comp.color }}
              >
                {comp.name}
              </h3>

              <div className="mt-4">
                <p
                  className={`text-3xl font-bold ${
                    comp.highlight ? "gradient-text" : "text-[var(--text-primary)]"
                  }`}
                >
                  {comp.price}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {comp.period}
                </p>
                {comp.yearlyNote && (
                  <p className="mt-1 font-[var(--font-mono)] text-xs text-[var(--accent-pink)]">
                    = {comp.yearlyNote}
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-2 text-left">
                {comp.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                  >
                    {comp.highlight ? (
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-lime)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
