import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandQuestionnaire, brandTypography } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateTypographyPairs } from "@/lib/typography";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let industry: string;
    let personality: string[];

    if (body.questionnaireId) {
      const [q] = await db
        .select()
        .from(brandQuestionnaire)
        .where(eq(brandQuestionnaire.id, body.questionnaireId))
        .limit(1);

      if (!q) {
        return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
      }

      industry = q.industry ?? "Other";
      personality = (q.brandPersonality as string[]) ?? [];
    } else {
      industry = body.industry ?? "Other";
      personality = body.brandPersonality ?? [];
    }

    const pairs = generateTypographyPairs(industry, personality, 3);

    if (body.questionnaireId) {
      // Remove previously generated (unselected) typography for this questionnaire
      await db
        .delete(brandTypography)
        .where(eq(brandTypography.questionnaireId, body.questionnaireId));

      const rows = await db
        .insert(brandTypography)
        .values(
          pairs.map((p) => ({
            questionnaireId: body.questionnaireId as string,
            name: p.name,
            headingFamily: p.heading.family,
            headingWeight: p.heading.weight,
            headingCategory: p.heading.category,
            bodyFamily: p.body.family,
            bodyWeight: p.body.weight,
            bodyCategory: p.body.category,
            selected: false,
          }))
        )
        .returning();

      return NextResponse.json({
        pairs: rows.map((r) => ({
          id: r.id,
          name: r.name,
          heading: {
            family: r.headingFamily,
            weight: r.headingWeight,
            category: r.headingCategory,
          },
          body: {
            family: r.bodyFamily,
            weight: r.bodyWeight,
            category: r.bodyCategory,
          },
        })),
      });
    }

    return NextResponse.json({ pairs });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
