import { ImageResponse } from "next/og";

export const alt = "LeaseBrief — Lease abstracts in 90 seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1a2238";
const BRASS = "#c89855";
const PARCHMENT = "#f7f4ec";
const WHISPER = "#6c7591";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: `radial-gradient(circle at 78% 22%, rgba(200,152,85,0.18), transparent 55%), ${PARCHMENT}`,
          fontFamily: "serif",
          color: INK,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            LB
          </span>
          <span
            style={{
              width: 32,
              height: 2,
              background: BRASS,
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontFamily: "sans-serif",
              color: WHISPER,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            LeaseBrief
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 22,
              fontFamily: "sans-serif",
              color: BRASS,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            For mid-market CRE brokers
          </span>
          <span
            style={{
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 920,
            }}
          >
            Lease abstracts in 90 seconds, not 8 hours.
          </span>
          <span
            style={{
              fontSize: 24,
              fontFamily: "sans-serif",
              color: WHISPER,
              lineHeight: 1.4,
              maxWidth: 880,
              marginTop: 8,
            }}
          >
            Drop a commercial lease PDF. Get 30 structured fields with
            confidence scoring. Export to Yardi, MRI, or AppFolio in one click.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span
            style={{
              fontSize: 18,
              fontFamily: "sans-serif",
              color: WHISPER,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            $99 / month
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              background: BRASS,
              borderRadius: 6,
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontFamily: "sans-serif",
              color: WHISPER,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            50 abstracts included
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
