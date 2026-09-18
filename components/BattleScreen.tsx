"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Fighter, Loadout } from "@/lib/types";
import {
  applyMove,
  canAfford,
  chooseCpuMove,
  canUseMove,
  createBattle,
  hpPercent,
  isStunned,
  MAX_MOVES,
  moveCost,
  type BattleEvent,
  type BattleState,
  type Side,
} from "@/lib/battle";
import { getNarration } from "@/lib/narrateClient";
import type { NarrateInput } from "@/lib/narrate";
import { speak, unlockSpeech } from "@/lib/speak";
import { sfx, unlockAudio } from "@/lib/sfx";
import { TYPE_STYLES } from "@/lib/typeStyles";
import { EFFECT_META, effectTag } from "@/lib/effectMeta";
import FighterPortrait from "./FighterPortrait";
import HealthBar from "./HealthBar";
import DamagePopup from "./DamagePopup";
import SoundToggles from "./SoundToggles";
import StatusBadges from "./StatusBadges";

type BattleScreenProps = {
  player: Fighter;
  cpu: Fighter;
  playerLoadout: Loadout;
  cpuLoadout: Loadout;
  onFinish: (battle: BattleState) => void;
};

type HitInfo = { side: Side; id: number };
type PopupInfo = { side: Side; amount: number; crit: boolean; superEffective: boolean; id: number };
type BannerInfo = { id: number; text: string; kind: "crit" | "super" };
type Stamp = { id: number; icon: string; label: string; bg: string; text: string };

const IMPACT_MS = 250;
const CPU_THINK_MS = 1400;
const STUN_SKIP_MS = 1100;
const KO_HOLD_MS = 2200;
const BANNER_MS = 900;
const STAMP_MS = 900;
const STAMP_GAP_MS = 450;

function eventVisual(e: BattleEvent): { icon: string; bg: string; text: string } {
  if (e.label === "EXHAUSTED!") {
    return { icon: "⚠", bg: "bg-fight", text: "text-card" };
  }
  if (e.kind === "effect" && e.effect) {
    const icon = EFFECT_META[e.effect].icon;
    const palette: Record<string, { bg: string; text: string }> = {
      burn: { bg: "bg-fight", text: "text-card" },
      stun: { bg: "bg-gold", text: "text-ink" },
      shield: { bg: "bg-cobalt", text: "text-card" },
      heal: { bg: "bg-hp-high", text: "text-ink" },
      drain: { bg: "bg-hp-high", text: "text-ink" },
      boost: { bg: "bg-gold", text: "text-ink" },
      weaken: { bg: "bg-ink", text: "text-card" },
    };
    return { icon, ...(palette[e.effect] ?? { bg: "bg-ink", text: "text-card" }) };
  }
  switch (e.kind) {
    case "burn_tick":
      return { icon: "🔥", bg: "bg-fight", text: "text-card" };
    case "regen":
      return { icon: "🌱", bg: "bg-hp-high", text: "text-ink" };
    case "stunned":
      return { icon: "💫", bg: "bg-gold", text: "text-ink" };
    case "thorns":
      return { icon: "🌵", bg: "bg-fight", text: "text-card" };
    case "last_stand":
      return { icon: "🪦", bg: "bg-gold", text: "text-ink" };
    case "heal":
      return { icon: "✚", bg: "bg-hp-high", text: "text-ink" };
    case "drain":
      return { icon: "🩸", bg: "bg-hp-high", text: "text-ink" };
    case "ability":
      return { icon: "⚡", bg: "bg-ink", text: "text-card" };
    default:
      return { icon: "", bg: "bg-ink", text: "text-card" };
  }
}

function FighterStage({
  side,
  fighter,
  attacking,
  wobbling,
  hitId,
  popup,
  stamps,
  isLoser,
  koActive,
}: {
  side: Side;
  fighter: Fighter;
  attacking: boolean;
  wobbling: boolean;
  hitId: number | null;
  popup: PopupInfo | null;
  stamps: Stamp[];
  isLoser: boolean;
  koActive: boolean;
}) {
  const lungeAnimate =
    side === "player" ? { x: [0, 16, 0], y: [0, -10, 0] } : { x: [0, -16, 0], y: [0, 10, 0] };

  return (
    <div className="relative">
      <motion.div
        animate={
          isLoser && koActive
            ? { rotate: 85, y: 24, opacity: 0.35, filter: "grayscale(1)" }
            : wobbling
              ? { rotate: [0, -6, 6, -4, 4, 0] }
              : attacking
                ? lungeAnimate
                : { x: 0, y: 0, rotate: 0 }
        }
        transition={
          isLoser && koActive
            ? { duration: 0.6, ease: "easeIn" }
            : { duration: wobbling ? 0.6 : 0.25, ease: "easeOut" }
        }
      >
        <motion.div
          key={hitId ?? "idle"}
          animate={hitId !== null ? { x: [0, -10, 10, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            animate={{ filter: hitId !== null ? ["invert(0)", "invert(1)", "invert(0)"] : "invert(0)" }}
            transition={{ duration: 0.32, times: hitId !== null ? [0, 0.25, 1] : undefined }}
          >
            <FighterPortrait fighter={fighter} size="lg" />
          </motion.div>
        </motion.div>
      </motion.div>

      {wobbling && (
        <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 -rotate-3 border-2 border-ink bg-gold px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink shadow-hard-sm">
          💫 STUNNED
        </span>
      )}

      {popup && <DamagePopup amount={popup.amount} crit={popup.crit} superEffective={popup.superEffective} id={popup.id} />}

      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {stamps.map((s, i) => (
            <motion.span
              key={s.id}
              initial={{ opacity: 0, y: 0, scale: 0.6, rotate: i % 2 === 0 ? -6 : 6 }}
              animate={{ opacity: 1, y: -18 - i * 8, scale: 1 }}
              exit={{ opacity: 0, y: -36 - i * 8 }}
              transition={{ duration: 0.3 }}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest shadow-hard-sm ${s.bg} ${s.text}`}
            >
              {s.icon} {s.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function BattleScreen({ player, cpu, playerLoadout, cpuLoadout, onFinish }: BattleScreenProps) {
  const [battle, setBattle] = useState<BattleState>(() => createBattle(player, cpu, playerLoadout, cpuLoadout));
  const [busy, setBusy] = useState(false);
  const [attackingSide, setAttackingSide] = useState<Side | null>(null);
  const [wobbleSide, setWobbleSide] = useState<Side | null>(null);
  const [hitInfo, setHitInfo] = useState<HitInfo | null>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [stampsBySide, setStampsBySide] = useState<Record<Side, Stamp[]>>({ player: [], cpu: [] });
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

  function addStamp(side: Side, event: BattleEvent, uid: number) {
    const v = eventVisual(event);
    const stamp: Stamp = { id: uid, icon: v.icon, label: event.label, bg: v.bg, text: v.text };
    setStampsBySide((prev) => ({ ...prev, [side]: [...prev[side], stamp] }));
    schedule(() => {
      setStampsBySide((prev) => ({ ...prev, [side]: prev[side].filter((s) => s.id !== uid) }));
    }, STAMP_MS);
  }

  function playEventQueue(events: BattleEvent[], turn: number) {
    events.forEach((e, i) => {
      schedule(() => {
        addStamp(e.side, e, turn * 1000 + i);
      }, (i + 1) * STAMP_GAP_MS);
    });
  }

  function playTurn(side: Side, moveIndex: number, currentState: BattleState) {
    if (currentState.winner) return;
    setBusy(true);
    turnIdRef.current += 1;
    const myTurn = turnIdRef.current;

    const defenderSide: Side = side === "player" ? "cpu" : "player";
    const attackerFighter = side === "player" ? player : cpu;
    const defenderFighter = side === "player" ? cpu : player;

    const { state: next, result } = applyMove(currentState, side, moveIndex);
    const skipped = result.skipped;
    const burnKoed = skipped && result.ko;
    // The engine already emits an "EXHAUSTED!" event, so play its events as-is.
    const eventsToPlay = result.events;

    if (skipped) {
      setAwaitingLine(false);
      const line = burnKoed
        ? `${attackerFighter.fighterName} succumbs to the burn and can't continue!`
        : `${attackerFighter.fighterName} is seeing stars and skips the turn!`;
      typeLine(line, myTurn);
      speak(line);
    } else {
      setAttackingSide(side);
      setAwaitingLine(true);
      const move = result.move;
      const effectEvent = result.events.find((e) => e.kind === "effect");
      // `effectLabel` is being added to NarrateInput by the engine agent; the
      // intersection keeps this file typechecking clean before and after that lands.
      const narrateInput: NarrateInput & { effectLabel?: string } = {
        attackerName: attackerFighter.fighterName,
        attackerObject: attackerFighter.objectName,
        defenderName: defenderFighter.fighterName,
        defenderObject: defenderFighter.objectName,
        moveName: move ? move.name : "",
        moveDescription: move ? move.description : "",
        damage: result.damage,
        superEffective: result.superEffective,
        crit: result.crit,
        ko: result.ko,
        attackerHpPct: hpPercent(next[side]),
        defenderHpPct: hpPercent(next[defenderSide]),
        moveNumber: next.moveCount,
        effectLabel: effectEvent?.label,
      };
      getNarration(narrateInput).then((line) => {
        if (turnIdRef.current !== myTurn) return; // stale — a newer turn has already started
        setAwaitingLine(false);
        typeLine(line, myTurn);
        speak(line);
      });
    }

    schedule(() => {
      setAttackingSide(null);
      setBattle(next);

      if (skipped) {
        if (!burnKoed) {
          setWobbleSide(side);
          schedule(() => {
            setWobbleSide((w) => (w === side ? null : w));
          }, STAMP_MS);
        }
      } else {
        setHitInfo({ side: defenderSide, id: myTurn });
        setPopup({ side: defenderSide, amount: result.damage, crit: result.crit, superEffective: result.superEffective, id: myTurn });

        if (result.crit) sfx.crit();
        else if (result.superEffective) sfx.superHit();
        else sfx.hit();

        if (result.crit || result.superEffective) {
          setBanner({ id: myTurn, text: result.crit ? "CRITICAL HIT!" : "SUPER EFFECTIVE!", kind: result.crit ? "crit" : "super" });
          schedule(() => {
            setBanner((b) => (b && b.id === myTurn ? null : b));
          }, BANNER_MS);
        }

        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(result.crit ? [40, 30, 60] : 35);
        }
      }

      playEventQueue(eventsToPlay, myTurn);

      if (next.winner) {
        sfx.ko();
        schedule(() => {
          onFinishRef.current(next);
        }, KO_HOLD_MS);
        return;
      }

      if (side === "player") {
        schedule(() => {
          playTurn("cpu", chooseCpuMove(next), next);
        }, CPU_THINK_MS);
      } else if (isStunned(next, "player")) {
        // Never leave the buttons stuck: auto-skip the player's turn while stunned.
        schedule(() => {
          playTurn("player", 0, next);
        }, STUN_SKIP_MS);
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
    <div className="no-select flex h-dvh flex-col gap-1.5 overflow-hidden p-2 lg:h-auto lg:min-h-dvh lg:items-center lg:overflow-visible lg:py-6">
      <div className="flex w-full flex-1 flex-col gap-1.5 lg:max-w-5xl lg:flex-none lg:gap-3">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">
            MOVE {moveNumber}/{MAX_MOVES}
          </span>
          <SoundToggles />
        </div>

        {/* corners */}
        <div className="relative flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-3 lg:border-y-[3px] lg:border-ink lg:bg-paper-dark lg:px-6 lg:py-4">
          <div className="pointer-events-none absolute inset-x-6 top-3 z-0 hidden h-[2px] bg-ink/30 lg:block" />
          <div className="pointer-events-none absolute inset-x-6 top-7 z-0 hidden h-[2px] bg-ink/30 lg:block" />
          <div className="pointer-events-none absolute inset-x-6 top-11 z-0 hidden h-[2px] bg-ink/30 lg:block" />

          {/* cpu corner (top on mobile) */}
          <div className="relative z-10 flex flex-col items-end gap-1 lg:order-3 lg:w-64">
            <div className="flex items-center gap-1.5">
              <span className={`border-2 border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cpuTypeStyle.bg} ${cpuTypeStyle.onBg}`}>
                {cpuTypeStyle.icon} {cpuTypeStyle.label}
              </span>
              <span className="border-2 border-ink bg-rival px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-card">RIVAL</span>
            </div>
            <span className="headline rotate-1 text-xl text-ink lg:text-2xl">{cpu.fighterName}</span>
            <FighterStage
              side="cpu"
              fighter={cpu}
              attacking={attackingSide === "cpu"}
              wobbling={wobbleSide === "cpu"}
              hitId={hitInfo?.side === "cpu" ? hitInfo.id : null}
              popup={popup?.side === "cpu" ? popup : null}
              stamps={stampsBySide.cpu}
              isLoser={koActive && battle.winner !== "cpu"}
              koActive={koActive}
            />
            <div className="w-full max-w-[180px]">
              <HealthBar hp={battle.cpu.hp} maxHp={battle.cpu.maxHp} align="right" />
            </div>
            <StatusBadges bf={battle.cpu} align="right" />
          </div>

          {/* narration ticker */}
          <div className="relative z-10 min-h-[64px] border-y-[3px] border-ink bg-ink px-3 py-2 lg:order-4 lg:mt-2 lg:min-h-[52px] lg:basis-full">
            <p className="font-mono text-[11px] leading-snug text-card lg:text-sm">{displayText}</p>
            {awaitingLine && (
              <motion.span
                className="absolute right-3 top-2 text-sm"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                🎙️
              </motion.span>
            )}
          </div>

          {/* player corner (bottom on mobile) */}
          <div className="relative z-10 flex flex-col items-start gap-1 lg:order-1 lg:w-64">
            <div className="flex items-center gap-1.5">
              <span className="border-2 border-ink bg-cobalt px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-card">YOU</span>
              <span className={`border-2 border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${playerTypeStyle.bg} ${playerTypeStyle.onBg}`}>
                {playerTypeStyle.icon} {playerTypeStyle.label}
              </span>
            </div>
            <span className="headline -rotate-1 text-xl text-ink lg:text-2xl">{player.fighterName}</span>
            <FighterStage
              side="player"
              fighter={player}
              attacking={attackingSide === "player"}
              wobbling={wobbleSide === "player"}
              hitId={hitInfo?.side === "player" ? hitInfo.id : null}
              popup={popup?.side === "player" ? popup : null}
              stamps={stampsBySide.player}
              isLoser={koActive && battle.winner !== "player"}
              koActive={koActive}
            />
            <div className="w-full max-w-[180px]">
              <HealthBar hp={battle.player.hp} maxHp={battle.player.maxHp} align="left" />
            </div>
            <StatusBadges bf={battle.player} align="left" />
          </div>

          {/* vs marker (desktop only) */}
          <div className="relative z-10 hidden lg:order-2 lg:flex lg:items-center lg:justify-center">
            <span className="headline -rotate-3 text-3xl text-fight">VS</span>
          </div>
        </div>

        {/* move buttons */}
        <div className="mt-auto grid grid-cols-2 gap-1.5 pb-1 lg:mt-2">
          {battle.player.moves.map((move, idx) => {
            const style = TYPE_STYLES[move.type];
            const isSpecial = Boolean(move.isSpecial);
            const cost = moveCost(move);
            const affordable = canAfford(battle.player, idx);
            const usable = canUseMove(battle.player, idx); // special: energy >= 8; normals: always true
            const specialLocked = isSpecial && !usable;
            const exhaustedNormal = !isSpecial && !affordable;
            const isSuperEffective = move.type === cpu.weakness;
            const disabled = busy || koActive || specialLocked;

            return (
              <button
                key={move.name}
                type="button"
                disabled={disabled}
                onClick={() => handleMoveTap(idx)}
                className={`press relative flex items-stretch overflow-hidden border-[3px] border-ink text-left shadow-hard ${
                  isSpecial && !specialLocked ? "bg-gold" : "bg-card"
                } ${disabled ? "opacity-50" : ""}`}
              >
                <div className={`flex w-9 shrink-0 items-center justify-center border-r-[3px] border-ink text-base ${style.bg} ${style.onBg}`}>
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1 px-1.5 py-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`headline truncate text-sm leading-none ${specialLocked ? "text-ink-faint" : "text-ink"}`}>
                      {move.name}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-ink-soft">PWR {move.power}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {!isSpecial && (
                      <span className="border border-ink bg-card px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-ink">
                        ⚡{cost}
                      </span>
                    )}
                    {move.effect && (
                      <span className="bg-ink px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-card">
                        {effectTag(move.effect.kind, move.effect.chance)}
                      </span>
                    )}
                    {isSpecial && (
                      <span className="font-mono text-[8px] uppercase tracking-widest text-ink">★ SPECIAL ⚡{cost}</span>
                    )}
                    {specialLocked && (
                      <span className="border border-ink bg-fight px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-card">
                        NEED ⚡{cost}
                      </span>
                    )}
                    {exhaustedNormal && (
                      <span className="border border-ink bg-fight px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-card">
                        EXHAUSTED · ½ DMG
                      </span>
                    )}
                  </div>
                </div>

                {isSuperEffective && !specialLocked && (
                  <span className="absolute -right-2 -top-2 rotate-3 border-2 border-ink bg-gold px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-ink shadow-hard-sm">
                    SUPER
                  </span>
                )}
                {disabled && !koActive && <div className="stripes pointer-events-none absolute inset-0 opacity-15" />}
                {exhaustedNormal && !disabled && <div className="stripes pointer-events-none absolute inset-0 opacity-10" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* crit / super-effective banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          >
            <motion.span
              initial={{ scale: 1.6, opacity: 0, rotate: banner.kind === "crit" ? -6 : 4 }}
              animate={{ scale: 1, opacity: 1, rotate: banner.kind === "crit" ? -3 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={`headline border-[3px] border-ink px-4 py-1 text-2xl shadow-hard-lg lg:text-4xl ${
                banner.kind === "crit" ? "bg-fight text-card" : "bg-gold text-ink"
              }`}
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
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-paper/40"
          >
            <motion.span
              initial={{ scale: 1.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="misprint headline text-6xl text-fight lg:text-8xl"
            >
              {battle.winMethod === "decision" ? "DECISION!" : "K.O."}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
