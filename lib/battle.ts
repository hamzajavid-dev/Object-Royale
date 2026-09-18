// Pure battle engine logic. No React, no runtime imports beyond types.
import type { Ability, EffectKind, Fighter, Loadout, Move } from "./types";

export type Side = "player" | "cpu";

export type Statuses = {
  burnTurns: number; // >0: loses 6 HP at the start of each of its own turns, then decrements
  stunned: boolean; // skips its next turn
  shielded: boolean; // next hit taken is halved, then cleared
  boosted: boolean; // next move +30%, then cleared
  weakened: boolean; // next move -30%, then cleared
};

export type BattleFighter = {
  fighter: Fighter;
  moves: Move[]; // ACTIVE moves: the chosen normal moves in loadout order, then the special LAST
  ability: Ability; // equipped ability
  hp: number;
  maxHp: number;
  specialUsed: boolean;
  statuses: Statuses;
  movesMade: number; // moves this fighter has taken (for first_strike)
  lastStandUsed: boolean;
  energy: number;
};

export type BattleEventKind =
  | "burn_tick"
  | "regen"
  | "stunned"
  | "effect"
  | "thorns"
  | "last_stand"
  | "heal"
  | "drain"
  | "ability";

export type BattleEvent = {
  side: Side; // who it happened TO / who it belongs to
  kind: BattleEventKind;
  amount?: number; // HP amount where relevant
  effect?: EffectKind; // for kind "effect"
  label: string; // short UPPERCASE display text
};

export type TurnResult = {
  attacker: Side;
  move: Move | null; // null when the turn was skipped (stunned) or the attacker fell to burn
  moveIndex: number;
  damage: number; // damage dealt to the defender by the move (0 if skipped)
  superEffective: boolean;
  crit: boolean;
  defenderHpAfter: number;
  attackerHpAfter: number;
  ko: boolean; // someone hit 0 HP this turn
  skipped: boolean; // attacker was stunned (or fell to burn before acting)
  events: BattleEvent[]; // in the order they happened, for the UI to play back
  energyCost: number; // energy actually spent by the attacker this turn
  exhausted: boolean; // attacker tried a normal move without enough energy
};

export type BattleState = {
  player: BattleFighter;
  cpu: BattleFighter;
  moveCount: number;
  log: TurnResult[];
  winner: Side | null;
  winMethod: "ko" | "decision" | null;
};

export const MAX_MOVES = 20;
export const MAX_ENERGY = 10;
export const START_ENERGY = 5;
export const ENERGY_REGEN = 3;
export const SPECIAL_COST = 8;
export type Rng = () => number;

/** Normal: clamp(round((power - 6) / 5), 1, 4)  → 10→1, 15→2, 20→3, 25→4. Special: SPECIAL_COST. */
export function moveCost(move: Move): number {
  if (move.isSpecial) return SPECIAL_COST;
  return Math.min(4, Math.max(1, Math.round((move.power - 6) / 5)));
}

/** true when bf.energy >= moveCost(bf.moves[i]) */
export function canAfford(bf: BattleFighter, moveIndex: number): boolean {
  const move = bf.moves[moveIndex];
  if (!move) return false;
  return bf.energy >= moveCost(move);
}

function otherSide(side: Side): Side {
  return side === "player" ? "cpu" : "player";
}

function makeStatuses(): Statuses {
  return { burnTurns: 0, stunned: false, shielded: false, boosted: false, weakened: false };
}

export function hpPercent(bf: BattleFighter): number {
  return Math.round((bf.hp / bf.maxHp) * 100);
}

// --- Loadouts -------------------------------------------------------------

export function defaultLoadout(fighter: Fighter): Loadout {
  const moveIndices = fighter.moves
    .map((m, i) => ({ m, i }))
    .filter((x) => !x.m.isSpecial)
    .slice(0, 3)
    .map((x) => x.i);
  return { moveIndices, abilityIndex: 0 };
}

export function autoLoadout(fighter: Fighter, opponent: Fighter, rng: Rng = Math.random): Loadout {
  const scored = fighter.moves
    .map((m, i) => ({ m, i }))
    .filter((x) => !x.m.isSpecial)
    .map((x) => ({
      i: x.i,
      weaknessMatch: x.m.type === opponent.weakness ? 1 : 0,
      hasEffect: x.m.effect ? 1 : 0,
      power: x.m.power,
    }));

  scored.sort((a, b) => {
    if (b.weaknessMatch !== a.weaknessMatch) return b.weaknessMatch - a.weaknessMatch;
    if (b.hasEffect !== a.hasEffect) return b.hasEffect - a.hasEffect;
    if (b.power !== a.power) return b.power - a.power;
    return a.i - b.i;
  });

  const moveIndices = scored.slice(0, 3).map((s) => s.i);
  const abilityIndex = fighter.abilities.length > 1 && rng() < 0.5 ? 1 : 0;
  return { moveIndices, abilityIndex };
}

export function resolveMoves(fighter: Fighter, loadout: Loadout): Move[] {
  const special = fighter.moves.find((m) => m.isSpecial) ?? null;
  const seen = new Set<number>();
  const chosen: Move[] = [];
  for (const idx of loadout.moveIndices) {
    if (chosen.length >= 3) break;
    const mv = fighter.moves[idx];
    if (!mv || mv.isSpecial) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);
    chosen.push(mv);
  }
  return special ? [...chosen, special] : chosen;
}

function resolveAbility(fighter: Fighter, loadout: Loadout): Ability {
  return fighter.abilities[loadout.abilityIndex] ?? fighter.abilities[0];
}

function makeBattleFighter(fighter: Fighter, loadout: Loadout): BattleFighter {
  return {
    fighter,
    moves: resolveMoves(fighter, loadout),
    ability: resolveAbility(fighter, loadout),
    hp: fighter.hp,
    maxHp: fighter.hp,
    specialUsed: false,
    statuses: makeStatuses(),
    movesMade: 0,
    lastStandUsed: false,
    energy: START_ENERGY,
  };
}

export function createBattle(
  player: Fighter,
  cpu: Fighter,
  playerLoadout?: Loadout,
  cpuLoadout?: Loadout
): BattleState {
  const pLoadout = playerLoadout ?? defaultLoadout(player);
  const cLoadout = cpuLoadout ?? defaultLoadout(cpu);
  return {
    player: makeBattleFighter(player, pLoadout),
    cpu: makeBattleFighter(cpu, cLoadout),
    moveCount: 0,
    log: [],
    winner: null,
    winMethod: null,
  };
}

export function canUseMove(bf: BattleFighter, moveIndex: number): boolean {
  const move = bf.moves[moveIndex];
  if (!move) return false;
  if (move.isSpecial) return bf.energy >= SPECIAL_COST;
  return true;
}

export function isStunned(state: BattleState, side: Side): boolean {
  return state[side].statuses.stunned;
}

// --- Damage ----------------------------------------------------------------

type DamageBreakdown = {
  damage: number;
  superEffective: boolean;
  crit: boolean;
  usedHothead: boolean;
  usedFirstStrike: boolean;
  usedShield: boolean;
};

function calcDamage(
  move: Move,
  attacker: BattleFighter,
  defender: BattleFighter,
  rng: Rng,
  exhausted: boolean = false
): DamageBreakdown {
  const superEffective = move.type === defender.fighter.weakness;
  const critChance = attacker.ability.kind === "lucky" ? 0.25 : 0.1;
  const crit = rng() < critChance;
  const variance = 0.85 + rng() * 0.3;

  let damage = move.power;
  damage *= superEffective ? 1.5 : 1;
  damage *= variance;
  damage *= crit ? 1.5 : 1;

  if (attacker.statuses.boosted) damage *= 1.3;
  if (attacker.statuses.weakened) damage *= 0.7;
  if (exhausted) damage *= 0.5;

  const usedHothead = attacker.ability.kind === "hothead" && hpPercent(attacker) < 50;
  if (usedHothead) damage *= 1.2;

  const usedFirstStrike = attacker.ability.kind === "first_strike" && attacker.movesMade === 0;
  if (usedFirstStrike) damage *= 1.5;

  if (defender.ability.kind === "thick_skin") damage *= 0.85;

  const usedShield = defender.statuses.shielded;
  if (usedShield) damage *= 0.5;

  damage = Math.max(1, Math.round(damage));
  return { damage, superEffective, crit, usedHothead, usedFirstStrike, usedShield };
}

function finalizeState(
  state: BattleState,
  attacker: Side,
  newAttackerBf: BattleFighter,
  newDefenderBf: BattleFighter,
  moveCount: number,
  result: TurnResult,
  winner: Side | null,
  winMethod: BattleState["winMethod"]
): BattleState {
  const newPlayer = attacker === "player" ? newAttackerBf : newDefenderBf;
  const newCpu = attacker === "cpu" ? newAttackerBf : newDefenderBf;
  return {
    ...state,
    player: newPlayer,
    cpu: newCpu,
    moveCount,
    log: [...state.log, result],
    winner,
    winMethod,
  };
}

function regenEnergy(bf: BattleFighter): BattleFighter {
  return { ...bf, energy: Math.min(MAX_ENERGY, bf.energy + ENERGY_REGEN) };
}

function decisionWinner(
  attacker: Side,
  attackerBf: BattleFighter,
  defenderBf: BattleFighter
): Side {
  const attackerPct = hpPercent(attackerBf);
  const defenderPct = hpPercent(defenderBf);
  const playerPct = attacker === "player" ? attackerPct : defenderPct;
  const cpuPct = attacker === "player" ? defenderPct : attackerPct;
  return playerPct >= cpuPct ? "player" : "cpu";
}

export function applyMove(
  state: BattleState,
  attacker: Side,
  moveIndex: number,
  rng: Rng = Math.random
): { state: BattleState; result: TurnResult } {
  if (state.winner) {
    throw new Error("Battle already has a winner");
  }

  const defenderSide = otherSide(attacker);
  const attackerBf = state[attacker];
  const wasStunned = attackerBf.statuses.stunned;

  if (!wasStunned && !canUseMove(attackerBf, moveIndex)) {
    throw new Error("Move cannot be used");
  }

  const events: BattleEvent[] = [];
  let curAttacker: BattleFighter = attackerBf;
  let curDefender: BattleFighter = state[defenderSide];

  // --- Start of turn: burn tick ---
  if (curAttacker.statuses.burnTurns > 0) {
    const hpAfterBurn = Math.max(0, curAttacker.hp - 6);
    curAttacker = {
      ...curAttacker,
      hp: hpAfterBurn,
      statuses: { ...curAttacker.statuses, burnTurns: curAttacker.statuses.burnTurns - 1 },
    };
    events.push({ side: attacker, kind: "burn_tick", amount: 6, label: "BURN −6" });

    if (hpAfterBurn === 0) {
      curAttacker = regenEnergy(curAttacker);
      const moveCount = state.moveCount + 1;
      const result: TurnResult = {
        attacker,
        move: null,
        moveIndex,
        damage: 0,
        superEffective: false,
        crit: false,
        defenderHpAfter: curDefender.hp,
        attackerHpAfter: curAttacker.hp,
        ko: true,
        skipped: true,
        events,
        energyCost: 0,
        exhausted: false,
      };
      const newState = finalizeState(state, attacker, curAttacker, curDefender, moveCount, result, defenderSide, "ko");
      return { state: newState, result };
    }
  }

  // --- Regen ---
  if (curAttacker.ability.kind === "regen") {
    const healedTo = Math.min(curAttacker.maxHp, curAttacker.hp + 4);
    curAttacker = { ...curAttacker, hp: healedTo };
    events.push({ side: attacker, kind: "regen", amount: 4, label: "+4 HP" });
  }

  // --- Stunned: skip the turn ---
  if (curAttacker.statuses.stunned) {
    curAttacker = { ...curAttacker, statuses: { ...curAttacker.statuses, stunned: false } };
    events.push({ side: attacker, kind: "stunned", label: "STUNNED!" });
    curAttacker = regenEnergy(curAttacker);

    const moveCount = state.moveCount + 1;
    let winner: Side | null = null;
    let winMethod: BattleState["winMethod"] = null;
    if (moveCount >= MAX_MOVES) {
      winner = decisionWinner(attacker, curAttacker, curDefender);
      winMethod = "decision";
    }

    const result: TurnResult = {
      attacker,
      move: null,
      moveIndex,
      damage: 0,
      superEffective: false,
      crit: false,
      defenderHpAfter: curDefender.hp,
      attackerHpAfter: curAttacker.hp,
      ko: false,
      skipped: true,
      events,
      energyCost: 0,
      exhausted: false,
    };
    const newState = finalizeState(state, attacker, curAttacker, curDefender, moveCount, result, winner, winMethod);
    return { state: newState, result };
  }

  // --- Damage ---
  const move = curAttacker.moves[moveIndex];
  if (!move) {
    throw new Error("Move cannot be used");
  }

  // --- Energy ---
  const cost = moveCost(move);
  const exhausted = !move.isSpecial && curAttacker.energy < cost;
  const energyCost = exhausted ? curAttacker.energy : cost;

  const breakdown = calcDamage(move, curAttacker, curDefender, rng, exhausted);

  if (exhausted) {
    events.push({ side: attacker, kind: "ability", label: "EXHAUSTED!" });
  }
  if (breakdown.usedFirstStrike) {
    events.push({ side: attacker, kind: "ability", label: "FIRST STRIKE!" });
  }
  if (breakdown.usedHothead) {
    events.push({ side: attacker, kind: "ability", label: "HOTHEAD!" });
  }
  if (breakdown.crit && curAttacker.ability.kind === "lucky") {
    events.push({ side: attacker, kind: "ability", label: "LUCKY CRIT!" });
  }
  if (breakdown.usedShield) {
    events.push({ side: defenderSide, kind: "ability", label: "SHIELD BLOCK" });
  }

  // One-shot statuses are consumed by this move.
  curAttacker = { ...curAttacker, statuses: { ...curAttacker.statuses, boosted: false, weakened: false } };
  curDefender = { ...curDefender, statuses: { ...curDefender.statuses, shielded: false } };

  let defenderHp = Math.max(0, curDefender.hp - breakdown.damage);
  let lastStandTriggered = false;
  if (defenderHp === 0 && curDefender.ability.kind === "last_stand" && !curDefender.lastStandUsed) {
    defenderHp = 1;
    lastStandTriggered = true;
  }
  curDefender = {
    ...curDefender,
    hp: defenderHp,
    lastStandUsed: curDefender.lastStandUsed || lastStandTriggered,
  };
  if (lastStandTriggered) {
    events.push({ side: defenderSide, kind: "last_stand", label: "LAST STAND!" });
  }

  // --- Thorns ---
  if (curDefender.ability.kind === "thorns") {
    const thornsRaw = Math.max(1, Math.round(breakdown.damage * 0.2));
    const newAttackerHp = Math.max(1, curAttacker.hp - thornsRaw);
    const actualThorns = curAttacker.hp - newAttackerHp;
    if (actualThorns > 0) {
      curAttacker = { ...curAttacker, hp: newAttackerHp };
      events.push({ side: attacker, kind: "thorns", amount: actualThorns, label: `THORNS −${actualThorns}` });
    }
  }

  // --- Effect roll ---
  if (move.effect) {
    const targetsDefender = move.effect.kind === "burn" || move.effect.kind === "stun" || move.effect.kind === "weaken";
    const canRoll = !targetsDefender || curDefender.hp > 0;
    if (canRoll) {
      const chance = move.effect.kind === "stun" ? Math.min(move.effect.chance, 35) : move.effect.chance;
      if (rng() * 100 < chance) {
        switch (move.effect.kind) {
          case "burn":
            curDefender = { ...curDefender, statuses: { ...curDefender.statuses, burnTurns: 2 } };
            events.push({ side: defenderSide, kind: "effect", effect: "burn", label: "BURNED!" });
            break;
          case "stun":
            curDefender = { ...curDefender, statuses: { ...curDefender.statuses, stunned: true } };
            events.push({ side: defenderSide, kind: "effect", effect: "stun", label: "STUNNED!" });
            break;
          case "weaken":
            curDefender = { ...curDefender, statuses: { ...curDefender.statuses, weakened: true } };
            events.push({ side: defenderSide, kind: "effect", effect: "weaken", label: "WEAKENED" });
            break;
          case "shield":
            curAttacker = { ...curAttacker, statuses: { ...curAttacker.statuses, shielded: true } };
            events.push({ side: attacker, kind: "effect", effect: "shield", label: "SHIELD UP" });
            break;
          case "boost":
            curAttacker = { ...curAttacker, statuses: { ...curAttacker.statuses, boosted: true } };
            events.push({ side: attacker, kind: "effect", effect: "boost", label: "BOOSTED" });
            break;
          case "heal": {
            const healedTo = Math.min(curAttacker.maxHp, curAttacker.hp + 15);
            curAttacker = { ...curAttacker, hp: healedTo };
            events.push({ side: attacker, kind: "effect", effect: "heal", amount: 15, label: "+15 HP" });
            break;
          }
          case "drain": {
            const drainAmount = Math.round(breakdown.damage * 0.5);
            const healedTo = Math.min(curAttacker.maxHp, curAttacker.hp + drainAmount);
            curAttacker = { ...curAttacker, hp: healedTo };
            events.push({
              side: attacker,
              kind: "effect",
              effect: "drain",
              amount: drainAmount,
              label: `DRAIN +${drainAmount}`,
            });
            break;
          }
        }
      }
    }
  }

  const energyAfterSpend = Math.max(0, curAttacker.energy - energyCost);
  const finalAttacker: BattleFighter = {
    ...curAttacker,
    specialUsed: move.isSpecial ? true : curAttacker.specialUsed,
    movesMade: curAttacker.movesMade + 1,
    energy: Math.min(MAX_ENERGY, energyAfterSpend + ENERGY_REGEN),
  };

  const moveCount = state.moveCount + 1;
  const ko = curDefender.hp === 0;

  let winner: Side | null = null;
  let winMethod: BattleState["winMethod"] = null;
  if (ko) {
    winner = attacker;
    winMethod = "ko";
  } else if (moveCount >= MAX_MOVES) {
    winner = decisionWinner(attacker, finalAttacker, curDefender);
    winMethod = "decision";
  }

  const result: TurnResult = {
    attacker,
    move,
    moveIndex,
    damage: breakdown.damage,
    superEffective: breakdown.superEffective,
    crit: breakdown.crit,
    defenderHpAfter: curDefender.hp,
    attackerHpAfter: finalAttacker.hp,
    ko,
    skipped: false,
    events,
    energyCost,
    exhausted,
  };

  const newState = finalizeState(state, attacker, finalAttacker, curDefender, moveCount, result, winner, winMethod);
  return { state: newState, result };
}

export function chooseCpuMove(state: BattleState, rng: Rng = Math.random): number {
  if (isStunned(state, "cpu")) return 0;

  const cpu = state.cpu;
  const player = state.player;
  const usable = cpu.moves.map((_, i) => i).filter((i) => canUseMove(cpu, i));

  if (usable.length === 0) {
    return 0;
  }

  // Prefer moves it can actually afford (won't trigger exhaustion); only fall
  // back to an unaffordable normal move if nothing affordable exists.
  const affordable = usable.filter((i) => canAfford(cpu, i));
  const pool = affordable.length > 0 ? affordable : usable;

  const specialIndex = cpu.moves.findIndex((m) => m.isSpecial);
  const specialUsable = specialIndex !== -1 && usable.includes(specialIndex);
  const specialChance = hpPercent(player) <= 50 ? 0.7 : 0.35;

  if (specialUsable && rng() < specialChance) {
    return specialIndex;
  }

  if (hpPercent(cpu) <= 40) {
    const healOrDrain = pool.filter((i) => {
      const eff = cpu.moves[i].effect;
      return eff && (eff.kind === "heal" || eff.kind === "drain");
    });
    if (healOrDrain.length > 0 && rng() < 0.5) {
      return healOrDrain[Math.floor(rng() * healOrDrain.length)];
    }
  }

  const superEffectiveIndices = pool.filter((i) => cpu.moves[i].type === player.fighter.weakness);
  if (superEffectiveIndices.length > 0 && rng() < 0.7) {
    return superEffectiveIndices[Math.floor(rng() * superEffectiveIndices.length)];
  }

  return pool[Math.floor(rng() * pool.length)];
}
