import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "diybrand.app — Build your brand in minutes, not months";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Build your brand in minutes,
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#c4b5fd",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          not months
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#e0e7ff",
            marginTop: 32,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          AI-powered brand identity — logo, colors, fonts, and guidelines
        </div>
        <div
          style={{
            fontSize: 24,
            color: "white",
            marginTop: 48,
            padding: "12px 32px",
            borderRadius: 12,
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          diybrand.app
        </div>
      </div>
    ),
    { ...size }
  );
}
