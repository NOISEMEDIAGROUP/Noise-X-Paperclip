import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandQuestionnaire, brandPalette, brandLogos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateLogos } from "@/lib/logo";
import { saveLogo, deleteLogo } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionnaireId } = body;

    if (!questionnaireId) {
      return NextResponse.json(
        { error: "questionnaireId is required" },
        { status: 400 }
      );
    }

    // Load questionnaire
    const [questionnaire] = await db
      .select()
      .from(brandQuestionnaire)
      .where(eq(brandQuestionnaire.id, questionnaireId))
      .limit(1);

    if (!questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      );
    }

    // Load selected palette
    const [palette] = await db
      .select()
      .from(brandPalette)
      .where(
        and(
          eq(brandPalette.questionnaireId, questionnaireId),
          eq(brandPalette.selected, true)
        )
      )
      .limit(1);

    const colors = palette?.colors ?? [
      { role: "primary", hex: "#6d28d9" },
      { role: "secondary", hex: "#4f46e5" },
      { role: "accent", hex: "#f59e0b" },
    ];

    const businessName = questionnaire.businessName ?? "Brand";
    const industry = questionnaire.industry ?? "Other";
    const personality = (questionnaire.brandPersonality as string[]) ?? [];

    // Generate logos via Gemini
    const concepts = await generateLogos(businessName, industry, personality, colors);

    // Delete previously generated logo files and DB rows
    const oldLogos = await db
      .select({ imagePath: brandLogos.imagePath })
      .from(brandLogos)
      .where(eq(brandLogos.questionnaireId, questionnaireId));

    for (const old of oldLogos) {
      if (old.imagePath) {
        await deleteLogo(old.imagePath);
      }
    }

    await db
      .delete(brandLogos)
      .where(eq(brandLogos.questionnaireId, questionnaireId));

    // Persist new logos: save files first, then insert DB rows
    const insertValues = [];
    for (const c of concepts) {
      // Generate a temporary ID for the filename
      const tempId = crypto.randomUUID();
      const imagePath = await saveLogo(tempId, c.imageBuffer, c.mimeType);

      insertValues.push({
        id: tempId,
        questionnaireId,
        name: c.name,
        variant: c.variant,
        imagePath,
        mimeType: c.mimeType,
        prompt: c.prompt,
        selected: false,
      });
    }

    const rows = await db
      .insert(brandLogos)
      .values(insertValues)
      .returning();

    return NextResponse.json({
      logos: rows.map((r) => ({
        id: r.id,
        name: r.name,
        variant: r.variant,
        imageUrl: `/api/logos/${r.id}/image`,
      })),
    });
  } catch (err) {
    console.error("Logo generation error:", err);
    const message =
      err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
