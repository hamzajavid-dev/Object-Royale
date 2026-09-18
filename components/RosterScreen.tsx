"use client";
import { useState } from "react";
import { motion } from "motion/react";
import type { Arena } from "@/lib/types";
import FighterCard from "./FighterCard";

type RosterScreenProps = {
  arena: Arena;
  onFight: (playerId: string, opponentId: string) => void;
  onBack: () => void;
};

export default function RosterScreen({ arena, onFight, onBack }: RosterScreenProps) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const player = arena.fighters.find((f) => f.id === playerId) ?? null;
  const opponent = arena.fighters.find((f) => f.id === opponentId) ?? null;
  const bothPicked = Boolean(player && opponent);

  function handleTap(id: string) {
    if (id === playerId) {
      setPlayerId(null);
      return;
    }
    if (id === opponentId) {
      setOpponentId(null);
      return;
    }
    if (playerId === null) {
      setPlayerId(id);
      return;
    }
    // player is already picked, and this tap is on a different card
    setOpponentId(id);
  }

  function handleFight() {
    if (player && opponent) {
      onFight(player.id, opponent.id);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col pt-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-neutral-400"
      >
        ← New arena
      </button>

      <h1 className="mt-2 text-center font-display text-3xl neon-yellow">
        {arena.arenaName}
      </h1>

      <p className="mt-2 text-center text-neutral-300">
        {!player && "Choose your fighter"}
        {player && !opponent && "Now choose your opponent"}
        {player && opponent && (
          <>
            <span className="text-neon-cyan">{player.fighterName}</span>
            {" vs "}
            <span className="text-neon-pink">{opponent.fighterName}</span>
          </>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-24">
        {arena.fighters.map((fighter, index) => {
          const selectedAs =
            fighter.id === playerId ? "player" : fighter.id === opponentId ? "opponent" : null;
          return (
            <FighterCard
              key={fighter.id}
              fighter={fighter}
              selectedAs={selectedAs}
              onTap={() => handleTap(fighter.id)}
              index={index}
            />
          );
        })}
      </div>

      <motion.button
        type="button"
        key={bothPicked ? "enabled" : "disabled"}
        initial={bothPicked ? { scale: 0.8 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        disabled={!bothPicked}
        onClick={handleFight}
        className={`sticky bottom-4 w-full rounded-2xl py-4 font-display text-2xl ${
          bothPicked
            ? "bg-neon-yellow text-black shadow-[0_0_30px_rgba(250,204,21,.6)]"
            : "bg-panel text-neutral-600"
        }`}
      >
        ⚔️ FIGHT!
      </motion.button>
    </div>
  );
}
