// Pure battle engine logic. No React, no runtime imports beyond types.
import type { Fighter, Move } from "./types";

export type Side = "player" | "cpu";

export type BattleFighter = {
  fighter: Fighter;
  hp: number; // current, never below 0
  maxHp: number;
  specialUsed: boolean;
};

export type TurnResult = {
  attacker: Side;
  move: Move;
  moveIndex: number;
  damage: number;
  superEffective: boolean; // move.type === defender.weakness
  crit: boolean;
  defenderHpAfter: number;
  ko: boolean;
};

export type BattleState = {
  player: BattleFighter;
  cpu: BattleFighter;
  moveCount: number; // total moves made by both sides
  log: TurnResult[];
  winner: Side | null;
  winMethod: "ko" | "decision" | null;
};

export const MAX_MOVES = 20; // 10 each; after that, higher HP % wins "by decision"

export type Rng = () => number; // returns [0, 1); default Math.random

function makeBattleFighter(fighter: Fighter): BattleFighter {
  return {
    fighter,
    hp: fighter.hp,
    maxHp: fighter.hp,
    specialUsed: false,
  };
}

export function createBattle(player: Fighter, cpu: Fighter): BattleState {
  return {
    player: makeBattleFighter(player),
    cpu: makeBattleFighter(cpu),
    moveCount: 0,
    log: [],
    winner: null,
    winMethod: null,
  };
}

export function calcDamage(
  move: Move,
  defender: Fighter,
  rng: Rng = Math.random
): { damage: number; superEffective: boolean; crit: boolean } {
  const superEffective = move.type === defender.weakness;
  const crit = rng() < 0.1;
  const variance = 0.85 + rng() * 0.3;
  let damage = move.power;
  damage *= superEffective ? 1.5 : 1;
  damage *= variance;
  damage *= crit ? 1.5 : 1;
  damage = Math.max(1, Math.round(damage));
  return { damage, superEffective, crit };
}

export function canUseMove(bf: BattleFighter, moveIndex: number): boolean {
  const move = bf.fighter.moves[moveIndex];
  if (!move) return false;
  if (move.isSpecial && bf.specialUsed) return false;
  return true;
}

function otherSide(side: Side): Side {
  return side === "player" ? "cpu" : "player";
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
  const attackerBf = state[attacker];
  if (!canUseMove(attackerBf, moveIndex)) {
    throw new Error("Move cannot be used");
  }

  const defenderSide = otherSide(attacker);
  const defenderBf = state[defenderSide];
  const move = attackerBf.fighter.moves[moveIndex];

  const { damage, superEffective, crit } = calcDamage(move, defenderBf.fighter, rng);
  const defenderHpAfter = Math.max(0, defenderBf.hp - damage);
  const ko = defenderHpAfter === 0;

  const newDefenderBf: BattleFighter = {
    ...defenderBf,
    hp: defenderHpAfter,
  };
  const newAttackerBf: BattleFighter = {
    ...attackerBf,
    specialUsed: move.isSpecial ? true : attackerBf.specialUsed,
  };

  const newMoveCount = state.moveCount + 1;

  const result: TurnResult = {
    attacker,
    move,
    moveIndex,
    damage,
    superEffective,
    crit,
    defenderHpAfter,
    ko,
  };

  let winner: Side | null = null;
  let winMethod: "ko" | "decision" | null = null;

  if (ko) {
    winner = attacker;
    winMethod = "ko";
  } else if (newMoveCount >= MAX_MOVES) {
    const attackerPct = hpPercent(newAttackerBf);
    const defenderPct = hpPercent(newDefenderBf);
    const playerPct = attacker === "player" ? attackerPct : defenderPct;
    const cpuPct = attacker === "player" ? defenderPct : attackerPct;
    winner = playerPct >= cpuPct ? "player" : "cpu";
    winMethod = "decision";
  }

  const newPlayer = attacker === "player" ? newAttackerBf : newDefenderBf;
  const newCpu = attacker === "cpu" ? newAttackerBf : newDefenderBf;

  const newState: BattleState = {
    ...state,
    player: newPlayer,
    cpu: newCpu,
    moveCount: newMoveCount,
    log: [...state.log, result],
    winner,
    winMethod,
  };

  return { state: newState, result };
}

export function chooseCpuMove(state: BattleState, rng: Rng = Math.random): number {
  const cpu = state.cpu;
  const player = state.player;
  const usable = cpu.fighter.moves
    .map((_, i) => i)
    .filter((i) => canUseMove(cpu, i));

  if (usable.length === 0) {
    throw new Error("No usable moves");
  }

  const specialIndex = cpu.fighter.moves.findIndex((m) => m.isSpecial);
  const specialUsable = specialIndex !== -1 && usable.includes(specialIndex);

  if (hpPercent(player) <= 35 && specialUsable && rng() < 0.6) {
    return specialIndex;
  }

  const superEffectiveIndices = usable.filter(
    (i) => cpu.fighter.moves[i].type === player.fighter.weakness
  );

  if (superEffectiveIndices.length > 0 && rng() < 0.7) {
    return superEffectiveIndices[Math.floor(rng() * superEffectiveIndices.length)];
  }

  return usable[Math.floor(rng() * usable.length)];
}

export function hpPercent(bf: BattleFighter): number {
  return Math.round((bf.hp / bf.maxHp) * 100);
}
