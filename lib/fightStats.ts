// Pure stats/summary computation for the victory screen and poster.
// No React, no runtime imports beyond types.
import type { BattleState, Side } from "./battle";

export type FightStats = {
  totalMoves: number;
  biggestHit: { by: string; move: string; damage: number } | null;
  superEffectiveCount: number;
  critCount: number;
  winnerHpLeftPct: number;
  flawless: boolean; // winner took 0 damage
  resultLine: string; // "Chai Titan defeated Laptop Lord by K.O. in 7 moves"
  headline: string; // punchy, e.g. "FLAWLESS VICTORY", "PHOTO FINISH", "TOTAL DOMINATION", "BY DECISION"
};

export function computeFightStats(battle: BattleState): FightStats {
  const { log, moveCount, winMethod } = battle;
  const winnerSide: Side = battle.winner ?? "player";
  const loserSide: Side = winnerSide === "player" ? "cpu" : "player";

  const winnerBf = battle[winnerSide];
  const loserBf = battle[loserSide];

  let biggestHit: FightStats["biggestHit"] = null;
  let superEffectiveCount = 0;
  let critCount = 0;

  for (const turn of log) {
    if (turn.superEffective) superEffectiveCount += 1;
    if (turn.crit) critCount += 1;
    if (!biggestHit || turn.damage > biggestHit.damage) {
      const attackerFighter = battle[turn.attacker].fighter;
      biggestHit = {
        by: attackerFighter.fighterName,
        move: turn.move.name,
        damage: turn.damage,
      };
    }
  }

  const winnerHpLeftPct = Math.round((winnerBf.hp / winnerBf.maxHp) * 100);
  const flawless = winnerBf.hp === winnerBf.maxHp;

  const methodLabel = winMethod === "decision" ? "decision" : "K.O.";
  const resultLine = `${winnerBf.fighter.fighterName} defeated ${loserBf.fighter.fighterName} by ${methodLabel} in ${moveCount} moves`;

  let headline: string;
  if (flawless) {
    headline = "FLAWLESS VICTORY";
  } else if (winMethod === "decision") {
    headline = "WON BY DECISION";
  } else if (winnerHpLeftPct < 15) {
    headline = "PHOTO FINISH";
  } else if (moveCount <= 6) {
    headline = "TOTAL DOMINATION";
  } else {
    headline = "K.O. VICTORY";
  }

  return {
    totalMoves: moveCount,
    biggestHit,
    superEffectiveCount,
    critCount,
    winnerHpLeftPct,
    flawless,
    resultLine,
    headline,
  };
}
