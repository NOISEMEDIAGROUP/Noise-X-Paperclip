import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandTypography } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { typographyId, questionnaireId } = await request.json();

    if (!typographyId || !questionnaireId) {
      return NextResponse.json(
        { error: "typographyId and questionnaireId are required" },
        { status: 400 }
      );
    }

    // Deselect all typography pairs for this questionnaire
    await db
      .update(brandTypography)
      .set({ selected: false })
      .where(eq(brandTypography.questionnaireId, questionnaireId));

    // Select the chosen one
    const [row] = await db
      .update(brandTypography)
      .set({ selected: true })
      .where(
        and(
          eq(brandTypography.id, typographyId),
          eq(brandTypography.questionnaireId, questionnaireId)
        )
      )
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Typography pair not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
