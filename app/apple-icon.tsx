import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eee6d3",
          backgroundImage: "radial-gradient(rgba(20,18,16,0.18) 2px, transparent 2.5px)", backgroundSize: "18px 18px",
        }}
      >
        <div
          style={{
            width: "88%",
            height: "88%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8, boxShadow: "6px 6px 0 0 #e23b26",
            border: "8px solid #141210",
            background: "#eee6d3",
          }}
        >
          <div style={{ fontSize: 92, lineHeight: 1, display: "flex" }}>⚔️</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
