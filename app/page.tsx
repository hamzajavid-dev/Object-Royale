"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import CaptureScreen from "@/components/CaptureScreen";
import RosterScreen from "@/components/RosterScreen";
import LoadoutScreen from "@/components/LoadoutScreen";
import VsScreen from "@/components/VsScreen";
import BattleScreen from "@/components/BattleScreen";
import VictoryScreen from "@/components/VictoryScreen";
import ScanningScreen from "@/components/ScanningScreen";
import { MOCK_ARENA } from "@/lib/mockArena";
import { useArenaScan } from "@/lib/useArenaScan";
import type { Arena, Loadout } from "@/lib/types";
import { autoLoadout } from "@/lib/battle";
import type { BattleState } from "@/lib/battle";

export type Screen = "capture" | "scanning" | "roster" | "loadout" | "vs" | "battle" | "victory";

const SCREEN_TRANSITION = {
  initial: { opacity: 0, x: 24, rotate: 1 },
  animate: { opacity: 1, x: 0, rotate: 0 },
  exit: { opacity: 0, x: -24, rotate: -1 },
  transition: { duration: 0.22, ease: "easeOut" as const },
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [arena, setArena] = useState<Arena | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [playerLoadout, setPlayerLoadout] = useState<Loadout | null>(null);
  const [cpuLoadout, setCpuLoadout] = useState<Loadout | null>(null);
  const [finalBattle, setFinalBattle] = useState<BattleState | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const scan = useArenaScan();

  const player = arena?.fighters.find((f) => f.id === playerId) ?? null;
  const opponent = arena?.fighters.find((f) => f.id === opponentId) ?? null;

  function handleDemo() {
    setArena(MOCK_ARENA);
    setScreen("roster");
  }

  function handlePhoto(file: File) {
    setScreen("scanning");
    scan.start(file);
  }

  function handleFight(pId: string, oId: string) {
    setPlayerId(pId);
    setOpponentId(oId);
    setScreen("loadout");
  }

  function handleLoadoutConfirm(loadout: Loadout) {
    setPlayerLoadout(loadout);
    if (opponent && player) {
      setCpuLoadout(autoLoadout(opponent, player));
    }
    setScreen("vs");
  }

  function clearLoadouts() {
    setPlayerLoadout(null);
    setCpuLoadout(null);
  }

  return (
    <AnimatePresence mode="wait">
      {screen === "capture" && (
        <motion.div key="capture" {...SCREEN_TRANSITION}>
          <CaptureScreen onPhoto={handlePhoto} onDemo={handleDemo} />
        </motion.div>
      )}

      {screen === "scanning" && (
        <motion.div key="scanning" {...SCREEN_TRANSITION}>
          <ScanningScreen
            photoDataUrl={scan.photoDataUrl}
            status={scan.status}
            arena={scan.arena}
            error={scan.error}
            onContinue={() => {
              if (scan.arena) {
                setArena(scan.arena);
                setScreen("roster");
              }
            }}
            onRetry={() => {
              scan.reset();
              setScreen("capture");
            }}
            onUseDemo={() => {
              scan.reset();
              setArena(MOCK_ARENA);
              setScreen("roster");
            }}
          />
        </motion.div>
      )}

      {screen === "roster" && arena && (
        <motion.div key="roster" {...SCREEN_TRANSITION}>
          <RosterScreen
            arena={arena}
            onFight={handleFight}
            onBack={() => {
              scan.reset();
              clearLoadouts();
              setArena(null);
              setScreen("capture");
            }}
          />
        </motion.div>
      )}

      {screen === "loadout" && player && opponent && (
        <motion.div key="loadout" {...SCREEN_TRANSITION}>
          <LoadoutScreen
            player={player}
            cpu={opponent}
            initial={playerLoadout ?? undefined}
            onConfirm={handleLoadoutConfirm}
            onBack={() => setScreen("roster")}
          />
        </motion.div>
      )}

      {screen === "vs" && player && opponent && (
        <motion.div key="vs" {...SCREEN_TRANSITION}>
          <VsScreen player={player} cpu={opponent} onDone={() => setScreen("battle")} />
        </motion.div>
      )}

      {screen === "battle" && player && opponent && playerLoadout && cpuLoadout && (
        <motion.div key="battle" {...SCREEN_TRANSITION}>
          <BattleScreen
            key={battleKey}
            player={player}
            cpu={opponent}
            playerLoadout={playerLoadout}
            cpuLoadout={cpuLoadout}
            onFinish={(b) => {
              setFinalBattle(b);
              setScreen("victory");
            }}
          />
        </motion.div>
      )}

      {screen === "victory" && player && opponent && arena && finalBattle && (
        <motion.div key="victory" {...SCREEN_TRANSITION}>
          <VictoryScreen
            player={player}
            cpu={opponent}
            battle={finalBattle}
            arenaName={arena.arenaName}
            onRematch={() => {
              setBattleKey((k) => k + 1);
              setScreen("vs");
            }}
            onRoster={() => {
              clearLoadouts();
              setScreen("roster");
            }}
            onNewArena={() => {
              scan.reset();
              clearLoadouts();
              setArena(null);
              setScreen("capture");
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
