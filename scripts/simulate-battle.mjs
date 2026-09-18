// Proves lib/battle.ts is correct. Plain Node ESM; Node 22.18+ strips the
// TypeScript types in ../lib/battle.ts automatically, no build step needed.
import {
  createBattle,
  applyMove,
  chooseCpuMove,
  calcDamage,
  canUseMove,
  MAX_MOVES,
} from "../lib/battle.ts";

let failures = 0;

function check(name, pass, detail) {
  if (pass) {
    console.log(`✅ ${name}`);
  } else {
    failures++;
    console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- Fixture fighters -------------------------------------------------

function move(name, type, power, extra = {}) {
  return { name, type, power, description: `${name} description`, ...extra };
}

const fighterA = {
  id: "a",
  objectName: "chai cup",
  fighterName: "Chai Titan",
  emoji: "☕",
  title: "The Steaming Menace",
  catchphrase: "You're about to get steeped.",
  hp: 100,
  type: "heat",
  weakness: "liquid",
  moves: [
    move("Ember Jab", "heat", 20),
    move("Spark Slice", "electric", 15),
    move("Inferno Overload", "heat", 30, { isSpecial: true }),
  ],
};

const fighterB = {
  id: "b",
  objectName: "water bottle",
  fighterName: "Hydro Flask",
  emoji: "💧",
  title: "The Cool Customer",
  catchphrase: "Feel the pressure.",
  hp: 100,
  type: "liquid",
  weakness: "heat",
  moves: [
    move("Splash", "liquid", 18),
    move("Wave Cutter", "sharp", 22),
    move("Tidal Surge", "liquid", 32, { isSpecial: true }),
  ],
};

const fighterC = {
  id: "c",
  objectName: "desk lamp",
  fighterName: "Lumen Bolt",
  emoji: "💡",
  title: "The Bright Spark",
  catchphrase: "Let's shed some light on this.",
  hp: 90,
  type: "electric",
  weakness: "blunt",
  moves: [
    move("Volt Kick", "electric", 16),
    move("Shock Wave", "electric", 24),
    move("Overcharge", "electric", 28, { isSpecial: true }),
  ],
};

const fighters = [fighterA, fighterB, fighterC];

function randomFighterPair(rng) {
  const i = Math.floor(rng() * fighters.length);
  let j = Math.floor(rng() * fighters.length);
  while (j === i) j = Math.floor(rng() * fighters.length);
  return [fighters[i], fighters[j]];
}

function choosePlayerMove(state, rng) {
  // Mirror the state so the player's fight logic is the same as the CPU's.
  const mirrored = { ...state, player: state.cpu, cpu: state.player };
  return chooseCpuMove(mirrored, rng);
}

// --- 1. 1,000 random battles -------------------------------------------

let seed = 42;
function seededRng() {
  // Simple LCG, deterministic across runs.
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed % 1000000) / 1000000;
}

let allBattlesOk = true;
let negativeHpSeen = false;
let koCount = 0;
let decisionCount = 0;
let totalMoves = 0;
let playerWins = 0;
const NUM_BATTLES = 1000;

for (let b = 0; b < NUM_BATTLES; b++) {
  const [pFighter, cFighter] = randomFighterPair(seededRng);
  let state = createBattle(pFighter, cFighter);

  let guard = 0;
  while (state.winner === null && guard < MAX_MOVES + 5) {
    guard++;
    const turn = state.moveCount % 2 === 0 ? "player" : "cpu";
    const moveIndex =
      turn === "player"
        ? choosePlayerMove(state, seededRng)
        : chooseCpuMove(state, seededRng);
    const { state: nextState } = applyMove(state, turn, moveIndex, seededRng);
    state = nextState;

    if (state.player.hp < 0 || state.cpu.hp < 0) negativeHpSeen = true;
  }

  if (state.winner === null || state.moveCount > MAX_MOVES) {
    allBattlesOk = false;
  }
  if (state.winMethod === "ko") koCount++;
  if (state.winMethod === "decision") decisionCount++;
  totalMoves += state.moveCount;
  if (state.winner === "player") playerWins++;
}

check(
  "1,000 random battles all resolve within MAX_MOVES with non-negative HP",
  allBattlesOk && !negativeHpSeen,
  `allBattlesOk=${allBattlesOk} negativeHpSeen=${negativeHpSeen}`
);

// --- 2. Special used at most once per side per battle -------------------

let specialViolation = false;
for (let b = 0; b < 200; b++) {
  const [pFighter, cFighter] = randomFighterPair(seededRng);
  let state = createBattle(pFighter, cFighter);
  let guard = 0;
  while (state.winner === null && guard < MAX_MOVES + 5) {
    guard++;
    const turn = state.moveCount % 2 === 0 ? "player" : "cpu";
    const moveIndex =
      turn === "player"
        ? choosePlayerMove(state, seededRng)
        : chooseCpuMove(state, seededRng);
    const { state: nextState } = applyMove(state, turn, moveIndex, seededRng);
    state = nextState;
  }
  const playerSpecials = state.log.filter(
    (t) => t.attacker === "player" && t.move.isSpecial
  ).length;
  const cpuSpecials = state.log.filter(
    (t) => t.attacker === "cpu" && t.move.isSpecial
  ).length;
  if (playerSpecials > 1 || cpuSpecials > 1) specialViolation = true;
}

check("Each side's special appears at most once per battle", !specialViolation);

// --- 3. Super-effective damage math --------------------------------------

const flatRng = () => 0.5; // crit=false (0.5 !< 0.1), variance = 0.85 + 0.5*0.3 = 1.0
const heatMove20 = fighterA.moves[0]; // power 20, type "heat"

const superEffectiveResult = calcDamage(heatMove20, fighterB, flatRng); // fighterB weak to heat
const normalResult = calcDamage(heatMove20, fighterC, flatRng); // fighterC weak to blunt

check(
  "Super-effective: power-20 move vs weak defender = 30 damage",
  superEffectiveResult.damage === 30 && superEffectiveResult.superEffective === true,
  `got ${superEffectiveResult.damage}`
);
check(
  "Non-effective: power-20 move vs non-weak defender = 20 damage",
  normalResult.damage === 20 && normalResult.superEffective === false,
  `got ${normalResult.damage}`
);

// --- 4. Crit damage math --------------------------------------------------

function critThenFlatRng() {
  let calls = 0;
  return () => {
    calls++;
    return calls === 1 ? 0.05 : 0.5;
  };
}

const critResult = calcDamage(heatMove20, fighterC, critThenFlatRng()); // no weakness match
check(
  "Crit: power-20 move with no weakness and a crit = 30 damage",
  critResult.damage === 30 && critResult.crit === true,
  `got ${critResult.damage}`
);

// --- 5. Immutability --------------------------------------------------

const immutableBefore = createBattle(fighterA, fighterB);
const beforePlayerHp = immutableBefore.player.hp;
const beforeCpuHp = immutableBefore.cpu.hp;
const beforeLogLength = immutableBefore.log.length;
const { state: afterState } = applyMove(immutableBefore, "player", 0, () => 0.5);

check(
  "Immutability: original state HP and log length unchanged after applyMove",
  immutableBefore.player.hp === beforePlayerHp &&
    immutableBefore.cpu.hp === beforeCpuHp &&
    immutableBefore.log.length === beforeLogLength &&
    afterState !== immutableBefore &&
    afterState.log.length === beforeLogLength + 1
);

// --- 6. Errors --------------------------------------------------------

let threwOnFinishedBattle = false;
try {
  let state = createBattle(fighterA, fighterB);
  // Force a KO by hammering with the special repeatedly is not possible
  // (specialUsed guard), so drive with big power moves until someone wins.
  let guard = 0;
  while (state.winner === null && guard < MAX_MOVES + 5) {
    guard++;
    const turn = state.moveCount % 2 === 0 ? "player" : "cpu";
    const idx = canUseMove(state[turn], 2) ? 2 : 0;
    const { state: next } = applyMove(state, turn, idx, () => 0.5);
    state = next;
  }
  applyMove(state, "player", 0, () => 0.5);
} catch {
  threwOnFinishedBattle = true;
}
check("applyMove throws when the battle is already finished", threwOnFinishedBattle);

let threwOnSpentSpecial = false;
try {
  let state = createBattle(fighterA, fighterB);
  const { state: afterSpecial } = applyMove(state, "player", 2, () => 0.9); // use special (no crit)
  applyMove(afterSpecial, "player", 2, () => 0.9); // special already used
} catch {
  threwOnSpentSpecial = true;
}
check("applyMove throws when reusing a spent special", threwOnSpentSpecial);

// --- 7. Summary ---------------------------------------------------------

const koPct = ((koCount / NUM_BATTLES) * 100).toFixed(1);
const decisionPct = ((decisionCount / NUM_BATTLES) * 100).toFixed(1);
const avgMoves = (totalMoves / NUM_BATTLES).toFixed(2);
const playerWinPct = ((playerWins / NUM_BATTLES) * 100).toFixed(1);

console.log("\n--- Summary over 1,000 battles ---");
console.log(`KO rate:        ${koPct}%`);
console.log(`Decision rate:  ${decisionPct}%`);
console.log(`Avg moves/battle: ${avgMoves}`);
console.log(`Player win rate: ${playerWinPct}%`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll checks passed.");
  process.exit(0);
}
