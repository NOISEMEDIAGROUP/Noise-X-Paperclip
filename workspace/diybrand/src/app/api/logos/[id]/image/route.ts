import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandLogos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readLogo } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [logo] = await db
    .select({
      imagePath: brandLogos.imagePath,
      imageData: brandLogos.imageData,
      mimeType: brandLogos.mimeType,
    })
    .from(brandLogos)
    .where(eq(brandLogos.id, id))
    .limit(1);

  if (!logo) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  // Prefer file-based storage
  if (logo.imagePath) {
    const buffer = await readLogo(logo.imagePath);
    if (buffer) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": logo.mimeType || "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  // Fallback: serve from legacy base64 column
  if (logo.imageData) {
    const match = logo.imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return NextResponse.json({ error: "Image data not found" }, { status: 404 });
}
