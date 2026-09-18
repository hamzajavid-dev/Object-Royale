"use client";
import { useState } from "react";
import { motion } from "motion/react";
import type { Arena, Fighter } from "@/lib/types";
import FighterCard from "./FighterCard";
import FighterPortrait from "./FighterPortrait";

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
    setOpponentId(id);
  }

  function handleFight() {
    if (player && opponent) onFight(player.id, opponent.id);
  }

  const stepLabel = !player ? "PICK YOUR FIGHTER" : !opponent ? "PICK A RIVAL" : "READY TO RUMBLE";

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-28 pt-5 lg:pb-10">
      <button
        type="button"
        onClick={onBack}
        className="press font-mono text-[11px] uppercase tracking-widest text-ink-soft"
      >
        ← New Arena
      </button>

      <h1 className="headline mt-2 -rotate-1 text-4xl text-ink lg:text-6xl">{arena.arenaName}</h1>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-fight">{stepLabel}</p>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:flex-1 lg:grid-cols-4">
          {arena.fighters.map((fighter, index) => {
            const selectedAs = fighter.id === playerId ? "player" : fighter.id === opponentId ? "opponent" : null;
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

        {/* desktop sidebar tray */}
        <div className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="ink-card sticky top-6 p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">Tale of the Card</p>
            <TrayPreview player={player} opponent={opponent} />
            <button
              type="button"
              disabled={!bothPicked}
              onClick={handleFight}
              className={`press mt-4 w-full border-[3px] border-ink py-3 font-mono text-sm uppercase tracking-widest shadow-hard ${
                bothPicked ? "bg-fight text-card" : "bg-paper-dark text-ink-faint"
              }`}
            >
              Next: Loadout →
            </button>
          </div>
        </div>
      </div>

      {/* mobile bottom tray */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-card p-3 lg:hidden">
        <TrayPreview player={player} opponent={opponent} compact />
        <motion.button
          type="button"
          key={bothPicked ? "enabled" : "disabled"}
          initial={bothPicked ? { scale: 0.85 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          disabled={!bothPicked}
          onClick={handleFight}
          className={`press mt-2 w-full border-[3px] border-ink py-3 font-mono text-sm uppercase tracking-widest shadow-hard ${
            bothPicked ? "bg-fight text-card" : "bg-paper-dark text-ink-faint"
          }`}
        >
          Next: Loadout →
        </motion.button>
      </div>
    </div>
  );
}

function TrayPreview({
  player,
  opponent,
  compact,
}: {
  player: Fighter | null;
  opponent: Fighter | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center gap-3 ${compact ? "mt-1" : "mt-3"}`}>
      <TraySlot fighter={player} label="You" accent="cobalt" />
      <span className="headline text-lg text-ink-faint">VS</span>
      <TraySlot fighter={opponent} label="Rival" accent="rival" />
    </div>
  );
}

function TraySlot({
  fighter,
  label,
  accent,
}: {
  fighter: Fighter | null;
  label: string;
  accent: "cobalt" | "rival";
}) {
  if (!fighter) {
    return (
      <div className="flex h-16 w-16 items-center justify-center border-[3px] border-dashed border-ink-faint font-mono text-[10px] text-ink-faint">
        ?
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <FighterPortrait fighter={fighter} size="sm" />
      <span
        className={`font-mono text-[9px] uppercase tracking-widest ${accent === "cobalt" ? "text-cobalt" : "text-rival"}`}
      >
        {label}
      </span>
    </div>
  );
}
