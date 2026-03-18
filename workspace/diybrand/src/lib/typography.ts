/**
 * Typography pairing generator.
 *
 * Maps personality adjectives → font style preferences, then pairs
 * heading + body fonts from a curated Google Fonts list using
 * contrast rules (serif+sans, geometric+humanist, etc.).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type FontWeight = 400 | 500 | 600 | 700;

export type FontPair = {
  heading: {
    family: string;
    weight: FontWeight;
    category: "serif" | "sans-serif" | "display" | "monospace";
  };
  body: {
    family: string;
    weight: FontWeight;
    category: "serif" | "sans-serif" | "display" | "monospace";
  };
  name: string;
};

// ─── Curated Google Fonts ───────────────────────────────────────────────────

type FontEntry = {
  family: string;
  category: "serif" | "sans-serif" | "display" | "monospace";
  traits: string[]; // personality traits this font matches
  weights: FontWeight[];
  role: "heading" | "body" | "both";
};

const FONT_CATALOG: FontEntry[] = [
  // Serifs
  { family: "Playfair Display", category: "serif", traits: ["Elegant", "Luxurious", "Sophisticated", "Classic"], weights: [400, 700], role: "heading" },
  { family: "Merriweather", category: "serif", traits: ["Trustworthy", "Classic", "Professional", "Warm"], weights: [400, 700], role: "both" },
  { family: "Lora", category: "serif", traits: ["Elegant", "Calm", "Warm", "Organic"], weights: [400, 600, 700], role: "both" },
  { family: "DM Serif Display", category: "serif", traits: ["Bold", "Sophisticated", "Luxurious", "Classic"], weights: [400], role: "heading" },
  { family: "Libre Baskerville", category: "serif", traits: ["Classic", "Professional", "Trustworthy"], weights: [400, 700], role: "both" },
  { family: "Cormorant Garamond", category: "serif", traits: ["Elegant", "Luxurious", "Sophisticated"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Source Serif 4", category: "serif", traits: ["Professional", "Trustworthy", "Classic", "Calm"], weights: [400, 600, 700], role: "both" },
  { family: "Fraunces", category: "serif", traits: ["Quirky", "Playful", "Warm", "Friendly"], weights: [400, 600, 700], role: "heading" },

  // Sans-serifs
  { family: "Inter", category: "sans-serif", traits: ["Modern", "Minimal", "Techy", "Professional"], weights: [400, 500, 600, 700], role: "both" },
  { family: "DM Sans", category: "sans-serif", traits: ["Modern", "Friendly", "Minimal", "Calm"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Space Grotesk", category: "sans-serif", traits: ["Techy", "Modern", "Innovative", "Edgy"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Plus Jakarta Sans", category: "sans-serif", traits: ["Modern", "Friendly", "Professional", "Warm"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Outfit", category: "sans-serif", traits: ["Modern", "Minimal", "Friendly", "Calm"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Sora", category: "sans-serif", traits: ["Innovative", "Techy", "Modern", "Bold"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Nunito", category: "sans-serif", traits: ["Friendly", "Playful", "Warm", "Organic"], weights: [400, 600, 700], role: "body" },
  { family: "Work Sans", category: "sans-serif", traits: ["Professional", "Modern", "Trustworthy", "Minimal"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Manrope", category: "sans-serif", traits: ["Modern", "Minimal", "Innovative", "Professional"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Rubik", category: "sans-serif", traits: ["Friendly", "Playful", "Energetic", "Warm"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Poppins", category: "sans-serif", traits: ["Friendly", "Modern", "Energetic", "Bold"], weights: [400, 500, 600, 700], role: "both" },
  { family: "Oswald", category: "sans-serif", traits: ["Bold", "Edgy", "Energetic", "Modern"], weights: [400, 500, 600, 700], role: "heading" },
  { family: "Bebas Neue", category: "sans-serif", traits: ["Bold", "Edgy", "Energetic"], weights: [400], role: "heading" },

  // Display
  { family: "Archivo Black", category: "display", traits: ["Bold", "Edgy", "Energetic"], weights: [400], role: "heading" },
  { family: "Righteous", category: "display", traits: ["Playful", "Quirky", "Energetic", "Friendly"], weights: [400], role: "heading" },

  // Monospace (niche use)
  { family: "JetBrains Mono", category: "monospace", traits: ["Techy", "Modern", "Innovative", "Edgy"], weights: [400, 500, 700], role: "heading" },
];

// ─── Pairing contrast rules ────────────────────────────────────────────────

/**
 * Good pairings use contrast: different categories or different
 * visual weights create readable hierarchy.
 */
const CONTRAST_PAIRS: [string, string][] = [
  ["serif", "sans-serif"],
  ["display", "sans-serif"],
  ["sans-serif", "serif"],
  ["monospace", "sans-serif"],
  ["display", "serif"],
];

function isGoodContrast(
  headCat: string,
  bodyCat: string
): boolean {
  // Same category is OK if fonts are visually distinct
  if (headCat === bodyCat && headCat === "sans-serif") return true;
  return CONTRAST_PAIRS.some(
    ([h, b]) => h === headCat && b === bodyCat
  );
}

// ─── Industry font style hints ─────────────────────────────────────────────

const INDUSTRY_STYLE: Record<string, { preferSerif: boolean; preferDisplay: boolean }> = {
  Technology: { preferSerif: false, preferDisplay: false },
  "E-commerce": { preferSerif: false, preferDisplay: false },
  "Food & Beverage": { preferSerif: true, preferDisplay: true },
  "Health & Wellness": { preferSerif: false, preferDisplay: false },
  Education: { preferSerif: true, preferDisplay: false },
  Finance: { preferSerif: true, preferDisplay: false },
  "Creative & Design": { preferSerif: false, preferDisplay: true },
  "Real Estate": { preferSerif: true, preferDisplay: false },
  "Fashion & Apparel": { preferSerif: true, preferDisplay: true },
  "Travel & Hospitality": { preferSerif: true, preferDisplay: false },
  Entertainment: { preferSerif: false, preferDisplay: true },
  Consulting: { preferSerif: true, preferDisplay: false },
  "Non-profit": { preferSerif: false, preferDisplay: false },
  Other: { preferSerif: false, preferDisplay: false },
};

// ─── Variant names for generated pairs ──────────────────────────────────────

const PAIR_NAMES = [
  "Modern Classic",
  "Bold Statement",
  "Clean & Warm",
];

// ─── Scoring & generation ──────────────────────────────────────────────────

function scoreFont(font: FontEntry, personality: string[]): number {
  let score = 0;
  for (const trait of personality) {
    if (font.traits.includes(trait)) score += 10;
  }
  return score;
}

function pickHeadingWeight(font: FontEntry): FontWeight {
  // Prefer 700 or 600 for headings
  if (font.weights.includes(700)) return 700;
  if (font.weights.includes(600)) return 600;
  return font.weights[0]!;
}

function pickBodyWeight(font: FontEntry): FontWeight {
  // Prefer 400 for body
  if (font.weights.includes(400)) return 400;
  return font.weights[0]!;
}

/**
 * Simple seeded shuffle to get deterministic but varied results
 * based on personality + industry combination.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function hashInputs(industry: string, personality: string[]): number {
  const str = industry + personality.sort().join(",");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

export function generateTypographyPairs(
  industry: string,
  personality: string[],
  count = 3
): FontPair[] {
  const style = INDUSTRY_STYLE[industry] ?? INDUSTRY_STYLE["Other"]!;
  const seed = hashInputs(industry, personality);

  // Score all fonts
  const scored = FONT_CATALOG.map((f) => ({
    font: f,
    score: scoreFont(f, personality),
  }));

  // Separate heading and body candidates
  const headingCandidates = scored
    .filter((s) => s.font.role === "heading" || s.font.role === "both")
    .sort((a, b) => b.score - a.score);

  const bodyCandidates = scored
    .filter((s) => s.font.role === "body" || s.font.role === "both")
    .sort((a, b) => b.score - a.score);

  // Apply industry preference boost
  if (style.preferSerif) {
    headingCandidates.sort((a, b) => {
      const aBoost = a.font.category === "serif" ? 5 : 0;
      const bBoost = b.font.category === "serif" ? 5 : 0;
      return (b.score + bBoost) - (a.score + aBoost);
    });
  }
  if (style.preferDisplay) {
    headingCandidates.sort((a, b) => {
      const aBoost = a.font.category === "display" ? 3 : 0;
      const bBoost = b.font.category === "display" ? 3 : 0;
      return (b.score + bBoost) - (a.score + aBoost);
    });
  }

  // Shuffle with seed for variety across same-score fonts
  const shuffledHeadings = seededShuffle(headingCandidates, seed);
  const shuffledBodies = seededShuffle(bodyCandidates, seed + 1);

  const pairs: FontPair[] = [];
  const usedHeadings = new Set<string>();
  const usedBodies = new Set<string>();

  for (const headEntry of shuffledHeadings) {
    if (pairs.length >= count) break;

    const head = headEntry.font;
    if (usedHeadings.has(head.family)) continue;

    // Find best matching body font
    for (const bodyEntry of shuffledBodies) {
      const body = bodyEntry.font;
      if (body.family === head.family) continue; // no self-pairing
      if (usedBodies.has(body.family)) continue;
      if (!isGoodContrast(head.category, body.category)) continue;

      usedHeadings.add(head.family);
      usedBodies.add(body.family);

      pairs.push({
        heading: {
          family: head.family,
          weight: pickHeadingWeight(head),
          category: head.category,
        },
        body: {
          family: body.family,
          weight: pickBodyWeight(body),
          category: body.category,
        },
        name: PAIR_NAMES[pairs.length] ?? `Pair ${pairs.length + 1}`,
      });
      break;
    }
  }

  // Fallback: if we couldn't generate enough pairs, relax constraints
  if (pairs.length < count) {
    for (const headEntry of shuffledHeadings) {
      if (pairs.length >= count) break;
      const head = headEntry.font;
      if (usedHeadings.has(head.family)) continue;

      for (const bodyEntry of shuffledBodies) {
        const body = bodyEntry.font;
        if (body.family === head.family) continue;
        if (usedBodies.has(body.family)) continue;

        usedHeadings.add(head.family);
        usedBodies.add(body.family);

        pairs.push({
          heading: {
            family: head.family,
            weight: pickHeadingWeight(head),
            category: head.category,
          },
          body: {
            family: body.family,
            weight: pickBodyWeight(body),
            category: body.category,
          },
          name: PAIR_NAMES[pairs.length] ?? `Pair ${pairs.length + 1}`,
        });
        break;
      }
    }
  }

  return pairs;
}

/**
 * Build a Google Fonts URL to load a set of font families.
 */
export function googleFontsUrl(pairs: FontPair[]): string {
  const families = new Set<string>();
  for (const pair of pairs) {
    const hWeights = [pair.heading.weight];
    const bWeights = [pair.body.weight];
    families.add(`family=${encodeURIComponent(pair.heading.family)}:wght@${hWeights.join(";")}`);
    families.add(`family=${encodeURIComponent(pair.body.family)}:wght@${bWeights.join(";")}`);
  }
  return `https://fonts.googleapis.com/css2?${[...families].join("&")}&display=swap`;
}
