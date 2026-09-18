"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Ability, Fighter, Loadout, Move } from "@/lib/types";
import { defaultLoadout } from "@/lib/battle";
import { TYPE_STYLES } from "@/lib/typeStyles";
import { ABILITY_META, EFFECT_META, effectTag } from "@/lib/effectMeta";
import { sfx } from "@/lib/sfx";
import FighterPortrait from "./FighterPortrait";

type LoadoutScreenProps = {
  player: Fighter;
  cpu: Fighter;
  initial?: Loadout;
  onConfirm: (loadout: Loadout) => void;
  onBack: () => void;
};

export default function LoadoutScreen({ player, cpu, initial, onConfirm, onBack }: LoadoutScreenProps) {
  const normalMoves = useMemo(() => player.moves.filter((m) => !m.isSpecial), [player]);
  const specialMove = useMemo(
    () => player.moves.find((m) => m.isSpecial) ?? player.moves[player.moves.length - 1],
    [player]
  );
  const maxPicks = Math.min(3, normalMoves.length);

  const [moveIndices, setMoveIndices] = useState<number[]>(() => {
    const base = initial ?? defaultLoadout(player);
    const valid = base.moveIndices.filter((i) => player.moves[i] && !player.moves[i].isSpecial);
    return valid.slice(0, maxPicks);
  });
  const [abilityIndex, setAbilityIndex] = useState<number>(() => (initial ?? defaultLoadout(player)).abilityIndex);

  const playerType = TYPE_STYLES[player.type];
  const cpuWeaknessStyle = TYPE_STYLES[cpu.weakness];
  const valid = moveIndices.length === maxPicks;

  function toggleMove(index: number) {
    setMoveIndices((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= maxPicks) return prev;
      return [...prev, index];
    });
    sfx.select();
  }

  function selectAbility(index: number) {
    setAbilityIndex(index);
    sfx.select();
  }

  function handleConfirm() {
    if (!valid) return;
    onConfirm({ moveIndices, abilityIndex });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-28 pt-5">
      <h1 className="headline -rotate-1 text-3xl text-ink lg:text-5xl">Corner Team</h1>
      <p className="font-mono text-xs uppercase tracking-widest text-fight">Build Your Kit</p>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* left: player + rival preview */}
        <div className="lg:w-80 lg:shrink-0">
          <div className="ink-card p-4">
            <div className="flex items-center gap-4">
              <FighterPortrait fighter={player} size="lg" />
              <div className="min-w-0">
                <p className="headline truncate text-2xl text-ink">{player.fighterName}</p>
                <p className="truncate text-xs italic text-ink-soft">{player.title}</p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${playerType.bg} ${playerType.onBg}`}
                >
                  {playerType.icon} {playerType.label}
                </span>
                <p className="mt-1 font-mono text-sm text-ink">HP {player.hp}</p>
              </div>
            </div>

            <div className="mt-4 h-[3px] bg-ink" />

            <div className="mt-3 flex items-center gap-3">
              <FighterPortrait fighter={cpu} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  VS {cpu.fighterName}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cpuWeaknessStyle.bg} ${cpuWeaknessStyle.onBg}`}
                >
                  WEAK TO {cpuWeaknessStyle.icon} {cpuWeaknessStyle.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* right: move pool + ability */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="headline text-xl text-ink">Move Pool</h2>
            <span className={`font-mono text-xs uppercase tracking-widest ${valid ? "text-cobalt" : "text-fight"}`}>
              {moveIndices.length}/{maxPicks} Picked
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {normalMoves.map((move, i) => {
              const index = player.moves.indexOf(move);
              const selected = moveIndices.includes(index);
              const disabledAdd = !selected && moveIndices.length >= maxPicks;
              const superEffective = move.type === cpu.weakness;
              return (
                <MoveCard
                  key={move.name}
                  move={move}
                  selected={selected}
                  disabled={disabledAdd}
                  superEffective={superEffective}
                  rivalName={cpu.fighterName}
                  rotate={i % 2 === 0 ? -1 : 1}
                  onToggle={() => toggleMove(index)}
                />
              );
            })}
          </div>

          {specialMove && (
            <div className="mt-3">
              <SpecialMoveCard move={specialMove} />
            </div>
          )}

          <h2 className="headline mt-6 text-xl text-ink">Ability</h2>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Choose 1</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {player.abilities.map((ability, i) => (
              <AbilityCard
                key={ability.name}
                ability={ability}
                selected={abilityIndex === i}
                rotate={i % 2 === 0 ? 1 : -1}
                onSelect={() => selectAbility(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-card p-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="press shrink-0 border-[3px] border-ink bg-card px-4 py-3 font-mono text-xs uppercase tracking-widest shadow-hard"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!valid}
            className={`press flex-1 border-[3px] border-ink py-3 font-mono text-sm uppercase tracking-widest shadow-hard ${
              valid ? "bg-fight text-card" : "bg-paper-dark text-ink-faint"
            }`}
          >
            Lock In &amp; Fight
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveCard({
  move,
  selected,
  disabled,
  superEffective,
  rivalName,
  rotate,
  onToggle,
}: {
  move: Move;
  selected: boolean;
  disabled: boolean;
  superEffective: boolean;
  rivalName: string;
  rotate: number;
  onToggle: () => void;
}) {
  const typeStyle = TYPE_STYLES[move.type];
  const eff = move.effect;
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      animate={{ scale: selected ? 1.04 : 1, rotate: selected ? rotate : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={`press relative w-full border-[3px] bg-card p-3 text-left shadow-hard disabled:cursor-not-allowed ${
        selected ? "border-cobalt" : "border-ink"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {selected && (
        <span className="absolute -top-3 -left-3 z-10 -rotate-3 border-[2px] border-ink bg-cobalt px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-card">
          ✓ Picked
        </span>
      )}
      {superEffective && (
        <span className="absolute -top-3 right-2 rotate-2 border-[2px] border-ink bg-gold px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink">
          Super Effective vs {rivalName}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="headline text-lg text-ink">{move.name}</span>
        <span className="font-mono text-sm text-ink-soft">⚡{move.power}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${typeStyle.bg} ${typeStyle.onBg}`}
        >
          {typeStyle.icon} {typeStyle.label}
        </span>
        {eff && (
          <span className="inline-flex items-center gap-1 border-[2px] border-ink bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink">
            {EFFECT_META[eff.kind].icon} {effectTag(eff.kind, eff.chance)}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">{move.description}</p>
      {eff && <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{EFFECT_META[eff.kind].rule}</p>}
    </motion.button>
  );
}

function SpecialMoveCard({ move }: { move: Move }) {
  const typeStyle = TYPE_STYLES[move.type];
  const eff = move.effect;
  return (
    <div className="relative border-[3px] border-gold bg-card p-3 shadow-hard">
      <span className="absolute -top-3 left-2 -rotate-2 border-[2px] border-ink bg-gold px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink">
        ★ Special · Always Equipped
      </span>
      <div className="flex items-center justify-between gap-2">
        <span className="headline text-lg text-ink">{move.name}</span>
        <span className="font-mono text-sm text-ink-soft">⚡{move.power}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${typeStyle.bg} ${typeStyle.onBg}`}
        >
          {typeStyle.icon} {typeStyle.label}
        </span>
        {eff && (
          <span className="inline-flex items-center gap-1 border-[2px] border-ink bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink">
            {EFFECT_META[eff.kind].icon} {effectTag(eff.kind, eff.chance)}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">{move.description}</p>
    </div>
  );
}

function AbilityCard({
  ability,
  selected,
  rotate,
  onSelect,
}: {
  ability: Ability;
  selected: boolean;
  rotate: number;
  onSelect: () => void;
}) {
  const meta = ABILITY_META[ability.kind];
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      animate={{ scale: selected ? 1.04 : 1, rotate: selected ? rotate : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={`press relative w-full border-[3px] bg-card p-3 text-left shadow-hard ${
        selected ? "border-fight" : "border-ink"
      }`}
    >
      {selected && (
        <span className="absolute -top-3 -left-3 z-10 -rotate-3 border-[2px] border-ink bg-fight px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-card">
          ● Equipped
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {meta.icon}
        </span>
        <span className="headline text-lg text-ink">{ability.name}</span>
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">{ability.description}</p>
      <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{meta.rule}</p>
    </motion.button>
  );
}
