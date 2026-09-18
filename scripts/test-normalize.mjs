// Free tests for lib/scan.ts — no network calls. Run with:
//   node scripts/test-normalize.mjs
import { normalizeArena, extractJson } from "../lib/scan.ts";

let failed = false;

function check(name, cond) {
  if (cond) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}`);
    failed = true;
  }
}

function baseFighter(overrides = {}) {
  return {
    fighterName: "Test Fighter",
    box_2d: [100, 100, 200, 200],
    hp: 90,
    type: "heat",
    weakness: "blunt",
    moves: [
      { name: "Move A", description: "desc", type: "heat", power: 15, isSpecial: false },
      { name: "Move B", description: "desc", type: "blunt", power: 20, isSpecial: false },
      { name: "Move C", description: "desc", type: "heat", power: 32, isSpecial: true },
    ],
    ...overrides,
  };
}

function arenaWith(fighters) {
  return { arenaName: "Test Arena", fighters };
}

// --- hp ---
{
  const arena = normalizeArena(arenaWith([baseFighter({ hp: 500 }), baseFighter({ fighterName: "F2" })]));
  check("hp 500 clamps to 120", arena.fighters[0].hp === 120);
}
{
  const noHp = baseFighter();
  delete noHp.hp;
  const arena = normalizeArena(arenaWith([noHp, baseFighter({ fighterName: "F2" })]));
  check("hp missing defaults to 90", arena.fighters[0].hp === 90);
}

// --- type / weakness ---
{
  const arena = normalizeArena(arenaWith([baseFighter({ type: "fire" }), baseFighter({ fighterName: "F2" })]));
  check('invalid type "fire" becomes "chaos"', arena.fighters[0].type === "chaos");
}
{
  const arena = normalizeArena(
    arenaWith([baseFighter({ type: "heat", weakness: "heat" }), baseFighter({ fighterName: "F2" })])
  );
  check("weakness equal to type gets changed", arena.fighters[0].weakness !== arena.fighters[0].type);
}

// --- moves padding / trimming / special ---
{
  const arena = normalizeArena(
    arenaWith([
      baseFighter({ moves: [{ name: "Only Move", description: "d", type: "heat", power: 15, isSpecial: false }] }),
      baseFighter({ fighterName: "F2" }),
    ])
  );
  const moves = arena.fighters[0].moves;
  check("1 move padded to 3", moves.length === 3);
  check(
    "last move is special with power 30-35",
    moves[2].isSpecial === true && moves[2].power >= 30 && moves[2].power <= 35
  );
  check("first two moves are not special", moves[0].isSpecial === false && moves[1].isSpecial === false);
}
{
  const fiveMoves = Array.from({ length: 5 }, (_, i) => ({
    name: `Move ${i}`,
    description: "d",
    type: "heat",
    power: 15,
    isSpecial: false,
  }));
  const arena = normalizeArena(arenaWith([baseFighter({ moves: fiveMoves }), baseFighter({ fighterName: "F2" })]));
  const moves = arena.fighters[0].moves;
  check("5 moves trimmed to 3", moves.length === 3);
  check("trimmed last move is still forced special 30-35", moves[2].isSpecial === true && moves[2].power >= 30);
}

// --- box sort / clamp ---
{
  const arena = normalizeArena(
    arenaWith([baseFighter({ box_2d: [900, 100, 200, 1200] }), baseFighter({ fighterName: "F2" })])
  );
  check(
    "messy box gets sorted and clamped",
    JSON.stringify(arena.fighters[0].box) === JSON.stringify([200, 100, 900, 1000])
  );
}

// --- duplicate ids ---
{
  const arena = normalizeArena(
    arenaWith([baseFighter({ fighterName: "Chai Titan" }), baseFighter({ fighterName: "Chai Titan" })])
  );
  check(
    "duplicate names get unique ids",
    arena.fighters[0].id === "chai-titan" && arena.fighters[1].id === "chai-titan-2"
  );
}

// --- fighter count guards ---
{
  let threw = false;
  try {
    normalizeArena(arenaWith([baseFighter()]));
  } catch {
    threw = true;
  }
  check("1 valid fighter throws", threw);
}
{
  const nine = Array.from({ length: 9 }, (_, i) => baseFighter({ fighterName: `Fighter ${i}` }));
  const arena = normalizeArena(arenaWith(nine));
  check("9 valid fighters capped to 6", arena.fighters.length === 6);
}
{
  // Fighters missing a name or a valid box should be dropped, not counted.
  const arena = normalizeArena(
    arenaWith([
      baseFighter(),
      baseFighter({ fighterName: "F2" }),
      { fighterName: "No Box" },
      { fighterName: "", box_2d: [1, 2, 3, 4] },
    ])
  );
  check("fighters with no name or no box are dropped", arena.fighters.length === 2);
}

// --- extractJson ---
{
  const parsed = extractJson('{"a":1}');
  check("extractJson handles plain JSON", parsed.a === 1);
}
{
  const parsed = extractJson('```json\n{"a":2}\n```');
  check("extractJson handles fenced block", parsed.a === 2);
}
{
  const parsed = extractJson('Sure! {"a":3} Hope this helps');
  check("extractJson handles prose-wrapped JSON", parsed.a === 3);
}
{
  let threw = false;
  try {
    extractJson("not json at all, no braces");
  } catch {
    threw = true;
  }
  check("extractJson throws on unparsable text", threw);
}

process.exit(failed ? 1 : 0);
