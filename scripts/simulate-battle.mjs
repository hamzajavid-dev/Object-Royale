// Proves lib/battle.ts is balanced. Plain Node ESM; Node 22.18+ strips the
// TypeScript types in ../lib/battle.ts automatically, no build step needed.
import { createBattle, applyMove, chooseCpuMove, autoLoadout, MAX_MOVES } from "../lib/battle.ts";
import { MOCK_ARENA } from "../lib/mockArena.ts";

const fighters = MOCK_ARENA.fighters;

function randomPair(rng) {
  const i = Math.floor(rng() * fighters.length);
  let j = Math.floor(rng() * fighters.length);
  while (j === i) j = Math.floor(rng() * fighters.length);
  return [fighters[i], fighters[j]];
}

let seed = 12345;
function seededRng() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed % 1000000) / 1000000;
}

const NUM_BATTLES = 2000;
let playerWins = 0;
let cpuWins = 0;
let koCount = 0;
let decisionCount = 0;
let totalMoves = 0;
let exceptions = 0;
let nanSeen = false;

const effectFireCounts = {};
const abilityFireCounts = {};

for (let b = 0; b < NUM_BATTLES; b++) {
  try {
    const [pFighter, cFighter] = randomPair(seededRng);
    const pLoadout = autoLoadout(pFighter, cFighter, seededRng);
    const cLoadout = autoLoadout(cFighter, pFighter, seededRng);
    let state = createBattle(pFighter, cFighter, pLoadout, cLoadout);

    let guard = 0;
    while (state.winner === null && guard < MAX_MOVES + 5) {
      guard++;
      const turn = state.moveCount % 2 === 0 ? "player" : "cpu";
      const mirrored = turn === "player" ? { ...state, player: state.cpu, cpu: state.player } : state;
      const moveIndex = chooseCpuMove(mirrored, seededRng);
      const { state: next } = applyMove(state, turn, moveIndex, seededRng);
      state = next;

      if (Number.isNaN(state.player.hp) || Number.isNaN(state.cpu.hp)) nanSeen = true;
      if (state.player.hp < 0 || state.cpu.hp < 0) nanSeen = true;

      const lastEvents = state.log[state.log.length - 1].events;
      for (const ev of lastEvents) {
        if (ev.kind === "effect" && ev.effect) {
          effectFireCounts[ev.effect] = (effectFireCounts[ev.effect] || 0) + 1;
        }
        if (ev.kind === "ability") {
          abilityFireCounts[ev.label] = (abilityFireCounts[ev.label] || 0) + 1;
        }
        if (ev.kind === "thorns" || ev.kind === "last_stand") {
          abilityFireCounts[ev.label] = (abilityFireCounts[ev.label] || 0) + 1;
        }
      }
    }

    if (state.winner === "player") playerWins++;
    if (state.winner === "cpu") cpuWins++;
    if (state.winMethod === "ko") koCount++;
    if (state.winMethod === "decision") decisionCount++;
    totalMoves += state.moveCount;
  } catch (err) {
    exceptions++;
    console.error("Exception in battle", b, err);
  }
}

const playerWinPct = ((playerWins / NUM_BATTLES) * 100).toFixed(1);
const cpuWinPct = ((cpuWins / NUM_BATTLES) * 100).toFixed(1);
const koPct = ((koCount / NUM_BATTLES) * 100).toFixed(1);
const decisionPct = ((decisionCount / NUM_BATTLES) * 100).toFixed(1);
const avgMoves = (totalMoves / NUM_BATTLES).toFixed(2);

console.log(`\n--- Simulation over ${NUM_BATTLES} battles ---`);
console.log(`Player win rate: ${playerWinPct}%`);
console.log(`CPU win rate:    ${cpuWinPct}%`);
console.log(`KO rate:         ${koPct}%`);
console.log(`Decision rate:   ${decisionPct}%`);
console.log(`Avg moves/battle: ${avgMoves}`);
console.log(`Exceptions: ${exceptions}`);
console.log(`NaN/negative HP seen: ${nanSeen}`);
console.log("\nEffect fire counts:", effectFireCounts);
console.log("Ability/passive fire counts:", abilityFireCounts);

let failed = false;
function check(name, cond) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failed = true;
}

check("No exceptions during simulation", exceptions === 0);
check("No NaN or negative HP seen", !nanSeen);
check(`Player win rate between 55 and 72% (got ${playerWinPct}%)`, playerWins / NUM_BATTLES >= 0.55 && playerWins / NUM_BATTLES <= 0.72);
check(`Avg battle length between 8 and 16 moves (got ${avgMoves})`, totalMoves / NUM_BATTLES >= 8 && totalMoves / NUM_BATTLES <= 16);

process.exit(failed ? 1 : 0);
