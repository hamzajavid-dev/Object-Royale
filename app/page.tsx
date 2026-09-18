"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import CaptureScreen from "@/components/CaptureScreen";
import RosterScreen from "@/components/RosterScreen";
import VsScreen from "@/components/VsScreen";
import BattleScreen from "@/components/BattleScreen";
import VictoryScreen from "@/components/VictoryScreen";
import { MOCK_ARENA } from "@/lib/mockArena";
import type { Arena } from "@/lib/types";
import type { BattleState } from "@/lib/battle";

export type Screen = "capture" | "scanning" | "roster" | "vs" | "battle" | "victory";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [arena, setArena] = useState<Arena | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [finalBattle, setFinalBattle] = useState<BattleState | null>(null);
  const [battleKey, setBattleKey] = useState(0);

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
    <AnimatePresence mode="wait">
      {screen === "capture" && (
        <motion.div
          key="capture"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <CaptureScreen onPhoto={handlePhoto} onDemo={handleDemo} />
        </motion.div>
      )}

      {screen === "roster" && arena && (
        <motion.div
          key="roster"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <RosterScreen arena={arena} onFight={handleFight} onBack={() => setScreen("capture")} />
        </motion.div>
      )}

      {screen === "vs" && player && opponent && (
        <motion.div
          key="vs"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <VsScreen player={player} cpu={opponent} onDone={() => setScreen("battle")} />
        </motion.div>
      )}

      {screen === "battle" && player && opponent && (
        <motion.div
          key="battle"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <BattleScreen
            key={battleKey}
            player={player}
            cpu={opponent}
            onFinish={(b) => {
              setFinalBattle(b);
              setScreen("victory");
            }}
          />
        </motion.div>
      )}

      {screen === "victory" && player && opponent && arena && finalBattle && (
        <motion.div
          key="victory"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <VictoryScreen
            player={player}
            cpu={opponent}
            battle={finalBattle}
            arenaName={arena.arenaName}
            onRematch={() => {
              setBattleKey((k) => k + 1);
              setScreen("vs");
            }}
            onRoster={() => setScreen("roster")}
            onNewArena={() => {
              setArena(null);
              setScreen("capture");
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
