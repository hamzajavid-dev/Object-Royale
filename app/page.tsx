"use client";
import { useState } from "react";
import CaptureScreen from "@/components/CaptureScreen";

export type Screen = "capture" | "scanning" | "roster" | "vs" | "battle" | "victory";

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setScreen is used starting Step 02
  const [screen, setScreen] = useState<Screen>("capture");

  return (
    <>
      {screen === "capture" && (
        <CaptureScreen
          onPhoto={(file) => console.log("photo selected", file.name)}
          onDemo={() => console.log("demo clicked")}
        />
      )}
      {/* other screens are added in later steps */}
    </>
  );
}
