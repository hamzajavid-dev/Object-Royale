import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
            borderRadius: 8, boxShadow: "14px 14px 0 0 #e23b26",
            border: "18px solid #141210",
            background: "#eee6d3",
          }}
        >
          <div style={{ fontSize: 260, lineHeight: 1, display: "flex" }}>⚔️</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
