import { ImageResponse } from "next/og";

export const size = { width: 128, height: 128 };
export const contentType = "image/png";

const INK = "#1a2238";
const BRASS = "#c89855";
const PARCHMENT = "#f7f4ec";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PARCHMENT,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -3,
          color: INK,
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <span>LB</span>
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: 30,
            right: 30,
            height: 4,
            background: BRASS,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
