"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Fighter } from "@/lib/types";
import {
  applyMove,
  chooseCpuMove,
  canUseMove,
  createBattle,
  hpPercent,
  MAX_MOVES,
  type BattleState,
  type Side,
} from "@/lib/battle";
import { getNarration } from "@/lib/narrateClient";
import type { NarrateInput } from "@/lib/narrate";
import { speak, unlockSpeech } from "@/lib/speak";
import { sfx, unlockAudio } from "@/lib/sfx";
import { TYPE_STYLES } from "@/lib/typeStyles";
import FighterPortrait from "./FighterPortrait";
import HealthBar from "./HealthBar";
import DamagePopup from "./DamagePopup";
import SoundToggles from "./SoundToggles";

type BattleScreenProps = {
  player: Fighter;
  cpu: Fighter;
  onFinish: (battle: BattleState) => void;
};

type HitInfo = { side: Side; id: number };
type PopupInfo = { side: Side; amount: number; crit: boolean; superEffective: boolean; id: number };
type BannerInfo = { id: number; text: string; color: "pink" | "yellow" };

const IMPACT_MS = 250;
const CPU_THINK_MS = 1600;
const KO_HOLD_MS = 2200;
const BANNER_MS = 900;

function FighterStage({
  side,
  fighter,
  attacking,
  hitId,
  popup,
  isLoser,
  koActive,
}: {
  side: Side;
  fighter: Fighter;
  attacking: boolean;
  hitId: number | null;
  popup: PopupInfo | null;
  isLoser: boolean;
  koActive: boolean;
}) {
  const lungeAnimate =
    side === "player" ? { x: [0, 18, 0], y: [0, -14, 0] } : { x: [0, -18, 0], y: [0, 14, 0] };

  return (
    <div className="relative">
      <motion.div
        animate={
          isLoser && koActive
            ? { rotate: 90, y: 30, opacity: 0.4, filter: "grayscale(1)" }
            : attacking
              ? lungeAnimate
              : { x: 0, y: 0 }
        }
        transition={isLoser && koActive ? { duration: 0.6, ease: "easeIn" } : { duration: 0.25, ease: "easeOut" }}
      >
        <motion.div
          key={hitId ?? "idle"}
          animate={hitId !== null ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FighterPortrait fighter={fighter} size="md" />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {hitId !== null && (
          <motion.div
            key={`flash-${hitId}`}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 rounded-xl bg-red-500/60"
          />
        )}
      </AnimatePresence>

      {popup && (
        <DamagePopup amount={popup.amount} crit={popup.crit} superEffective={popup.superEffective} id={popup.id} />
      )}
    </div>
  );
}

export default function BattleScreen({ player, cpu, onFinish }: BattleScreenProps) {
  const [battle, setBattle] = useState<BattleState>(() => createBattle(player, cpu));
  const [busy, setBusy] = useState(false);
  const [attackingSide, setAttackingSide] = useState<Side | null>(null);
  const [hitInfo, setHitInfo] = useState<HitInfo | null>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [banner, setBanner] = useState<BannerInfo | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [awaitingLine, setAwaitingLine] = useState(false);

  const turnIdRef = useRef(0);
  const audioUnlockedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  }

  function typeLine(text: string, myTurn: number) {
    setDisplayText("");
    let i = 0;
    const interval = setInterval(() => {
      if (turnIdRef.current !== myTurn) {
        clearInterval(interval);
        return;
      }
      i += 1;
      setDisplayText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 25);
    intervalsRef.current.push(interval);
  }

  useEffect(() => {
    // Kicks off the one-time opening typewriter reveal on mount; this is an
    // imperative animation start, not state derived from props/state.
    const opening = `${player.fighterName} vs ${cpu.fighterName}! The crowd is on its feet!`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    typeLine(opening, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current = [];
      intervalsRef.current = [];
    };
  }, []);

  function playTurn(side: Side, moveIndex: number, currentState: BattleState) {
    if (currentState.winner) return;
    setBusy(true);
    turnIdRef.current += 1;
    const myTurn = turnIdRef.current;

    const defenderSide: Side = side === "player" ? "cpu" : "player";
    const attackerFighter = side === "player" ? player : cpu;
    const defenderFighter = side === "player" ? cpu : player;

    const { state: next, result } = applyMove(currentState, side, moveIndex);

    setAttackingSide(side);

    setAwaitingLine(true);
    const narrateInput: NarrateInput = {
      attackerName: attackerFighter.fighterName,
      attackerObject: attackerFighter.objectName,
      defenderName: defenderFighter.fighterName,
      defenderObject: defenderFighter.objectName,
      moveName: result.move.name,
      moveDescription: result.move.description,
      damage: result.damage,
      superEffective: result.superEffective,
      crit: result.crit,
      ko: result.ko,
      attackerHpPct: hpPercent(next[side]),
      defenderHpPct: hpPercent(next[defenderSide]),
      moveNumber: next.moveCount,
    };
    getNarration(narrateInput).then((line) => {
      if (turnIdRef.current !== myTurn) return; // stale — a newer turn has already started
      setAwaitingLine(false);
      typeLine(line, myTurn);
      speak(line);
    });

    schedule(() => {
      setAttackingSide(null);
      setBattle(next);
      setHitInfo({ side: defenderSide, id: myTurn });
      setPopup({ side: defenderSide, amount: result.damage, crit: result.crit, superEffective: result.superEffective, id: myTurn });

      if (result.crit) sfx.crit();
      else if (result.superEffective) sfx.superHit();
      else sfx.hit();

      if (result.crit || result.superEffective) {
        setBanner({
          id: myTurn,
          text: result.crit ? "CRITICAL HIT!" : "SUPER EFFECTIVE!",
          color: result.crit ? "pink" : "yellow",
        });
        schedule(() => {
          setBanner((b) => (b && b.id === myTurn ? null : b));
        }, BANNER_MS);
      }

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(result.crit ? [40, 30, 60] : 35);
      }

      if (next.winner) {
        sfx.ko();
        schedule(() => {
          onFinishRef.current(next);
        }, KO_HOLD_MS);
      } else if (side === "player") {
        schedule(() => {
          playTurn("cpu", chooseCpuMove(next), next);
        }, CPU_THINK_MS);
      } else {
        setBusy(false);
      }
    }, IMPACT_MS);
  }

  function handleMoveTap(idx: number) {
    if (busy || battle.winner) return;
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      unlockAudio();
      unlockSpeech();
    }
    playTurn("player", idx, battle);
  }

  const moveNumber = Math.min(battle.moveCount + 1, MAX_MOVES);
  const playerTypeStyle = TYPE_STYLES[player.type];
  const cpuTypeStyle = TYPE_STYLES[cpu.type];
  const koActive = battle.winner !== null;

  return (
    <div className="no-select flex min-h-dvh flex-col gap-1.5 p-3">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <span className="font-display text-xs text-neutral-400">
          MOVE {moveNumber}/{MAX_MOVES}
        </span>
        <SoundToggles />
      </div>

      {/* cpu panel */}
      <div>
        <div className="flex items-center justify-end gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-black ${cpuTypeStyle.bg}`}>
            {cpuTypeStyle.icon} {cpuTypeStyle.label}
          </span>
          <span className="font-display text-lg neon-pink">{cpu.fighterName}</span>
        </div>
        <div className="mt-1">
          <HealthBar hp={battle.cpu.hp} maxHp={battle.cpu.maxHp} align="right" />
        </div>
        <div className="mt-2 flex justify-end">
          <FighterStage
            side="cpu"
            fighter={cpu}
            attacking={attackingSide === "cpu"}
            hitId={hitInfo?.side === "cpu" ? hitInfo.id : null}
            popup={popup?.side === "cpu" ? popup : null}
            isLoser={koActive && battle.winner !== "cpu"}
            koActive={koActive}
          />
        </div>
      </div>

      {/* narration box */}
      <div className="relative min-h-[88px] rounded-2xl border-2 border-panel-edge bg-panel p-4">
        <p className="font-body text-sm leading-relaxed text-neutral-100">{displayText}</p>
        {awaitingLine && (
          <motion.span
            className="absolute right-3 top-3 text-lg"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            🎙️
          </motion.span>
        )}
      </div>

      {/* player panel */}
      <div>
        <div className="flex justify-start">
          <FighterStage
            side="player"
            fighter={player}
            attacking={attackingSide === "player"}
            hitId={hitInfo?.side === "player" ? hitInfo.id : null}
            popup={popup?.side === "player" ? popup : null}
            isLoser={koActive && battle.winner !== "player"}
            koActive={koActive}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-lg neon-cyan">{player.fighterName}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-black ${playerTypeStyle.bg}`}>
            {playerTypeStyle.icon} {playerTypeStyle.label}
          </span>
        </div>
        <div className="mt-1">
          <HealthBar hp={battle.player.hp} maxHp={battle.player.maxHp} align="left" />
        </div>
      </div>

      {/* move buttons */}
      <div className="mt-auto flex flex-col gap-1.5 pt-1">
        {player.moves.map((move, idx) => {
          const style = TYPE_STYLES[move.type];
          const usable = canUseMove(battle.player, idx);
          const isUsedSpecial = Boolean(move.isSpecial) && battle.player.specialUsed;
          const isSuperEffective = move.type === cpu.weakness;
          const disabled = busy || !usable || koActive;

          return (
            <button
              key={move.name}
              type="button"
              disabled={disabled}
              onClick={() => handleMoveTap(idx)}
              className={`relative overflow-hidden rounded-xl border-2 bg-panel px-4 py-2.5 text-left transition-opacity ${
                isUsedSpecial ? "border-neutral-700" : style.border
              } ${disabled ? "opacity-40" : "opacity-100"}`}
            >
              {move.isSpecial && !isUsedSpecial && (
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-neon-yellow/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                />
              )}

              {move.isSpecial && !isUsedSpecial && (
                <span className="absolute -top-2 right-3 rounded-full bg-neon-yellow px-2 py-0.5 font-display text-[9px] text-black shadow-[0_0_12px_rgba(250,204,21,.7)]">
                  ★ SPECIAL · ONCE
                </span>
              )}
              {isUsedSpecial && (
                <span className="absolute -top-2 right-3 rounded-full bg-neutral-600 px-2 py-0.5 font-display text-[9px] text-white">
                  USED
                </span>
              )}

              <div className="relative flex items-center justify-between">
                <span className={`font-display text-sm ${isUsedSpecial ? "text-neutral-500" : "text-white"}`}>
                  {style.icon} {move.name}
                </span>
                <span className={`font-display text-sm ${isUsedSpecial ? "text-neutral-500" : "text-neutral-300"}`}>
                  ⚡{move.power}
                </span>
              </div>
              <div className="relative mt-0.5 flex items-center gap-2">
                <p className="truncate text-xs text-neutral-400">{move.description}</p>
                {isSuperEffective && (
                  <span className="shrink-0 rounded bg-neon-yellow/20 px-1.5 py-0.5 text-[9px] font-bold text-neon-yellow">
                    SUPER EFFECTIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* crit / super-effective banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          >
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className={`font-display text-3xl ${banner.color === "pink" ? "neon-pink" : "neon-yellow"}`}
            >
              {banner.text}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* K.O. / decision slam */}
      <AnimatePresence>
        {battle.winner && (
          <motion.div
            key="ko-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.span
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="font-display text-6xl neon-pink drop-shadow-[0_0_30px_rgba(255,46,136,.8)]"
            >
              {battle.winMethod === "decision" ? "DECISION!" : "K.O.!"}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
