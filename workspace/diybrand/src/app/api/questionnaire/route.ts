import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandQuestionnaire } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [row] = await db
      .insert(brandQuestionnaire)
      .values({
        businessName: body.businessName ?? null,
        industry: body.industry ?? null,
        businessDescription: body.businessDescription ?? null,
        targetAudience: body.targetAudience ?? null,
        brandPersonality: body.brandPersonality ?? null,
        competitors: body.competitors ?? null,
        visualPreferences: body.visualPreferences ?? null,
        currentStep: body.currentStep ?? 1,
      })
      .returning();

    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [row] = await db
      .update(brandQuestionnaire)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(brandQuestionnaire.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
