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
          background: "#0a0a12",
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,46,136,0.45), rgba(10,10,18,0) 65%)",
        }}
      >
        <div
          style={{
            width: "88%",
            height: "88%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 32,
            border: "8px solid #ff2e88",
            background: "#0a0a12",
          }}
        >
          <div style={{ fontSize: 92, lineHeight: 1, display: "flex" }}>⚔️</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
