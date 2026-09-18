"use client";
import { useState } from "react";
import CaptureScreen from "@/components/CaptureScreen";
import RosterScreen from "@/components/RosterScreen";
import FighterPortrait from "@/components/FighterPortrait";
import { MOCK_ARENA } from "@/lib/mockArena";
import type { Arena } from "@/lib/types";

export type Screen = "capture" | "scanning" | "roster" | "vs" | "battle" | "victory";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [arena, setArena] = useState<Arena | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const player = arena?.fighters.find((f) => f.id === playerId) ?? null;
  const opponent = arena?.fighters.find((f) => f.id === opponentId) ?? null;

  function handleDemo() {
    setArena(MOCK_ARENA);
    setScreen("roster");
  }

  function handlePhoto() {
    // TODO step 05: real AI scan
    setArena(MOCK_ARENA);
    setScreen("roster");
  }

  function handleFight(pId: string, oId: string) {
    setPlayerId(pId);
    setOpponentId(oId);
    setScreen("vs");
  }

  return (
    <>
      {screen === "capture" && (
        <CaptureScreen onPhoto={handlePhoto} onDemo={handleDemo} />
      )}

      {screen === "roster" && arena && (
        <RosterScreen
          arena={arena}
          onFight={handleFight}
          onBack={() => setScreen("capture")}
        />
      )}

      {screen === "vs" && player && opponent && (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-4">
            <FighterPortrait fighter={player} size="lg" />
            <span className="font-display text-4xl neon-pink">VS</span>
            <FighterPortrait fighter={opponent} size="lg" />
          </div>
          <p className="text-neutral-300">Battle coming in step 03</p>
          <button
            type="button"
            onClick={() => setScreen("roster")}
            className="text-neon-cyan"
          >
            ← Back to roster
          </button>
        </div>
      )}
    </>
  );
}
