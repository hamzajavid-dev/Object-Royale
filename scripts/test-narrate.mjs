// Free, no-network test for lib/narrate.ts. Run with:
//   node scripts/test-narrate.mjs
import { buildNarratePrompt, cleanLine, fallbackLine } from "../lib/narrate.ts";

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.log(`❌ ${label}`);
    failures++;
  }
}

function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function baseInput(overrides = {}) {
  return {
    attackerName: "Chai Titan",
    attackerObject: "chai cup",
    defenderName: "Toaster King",
    defenderObject: "toaster",
    moveName: "Scalding Splash",
    moveDescription: "A wave of blisteringly hot chai.",
    damage: 24,
    superEffective: false,
    crit: false,
    ko: false,
    attackerHpPct: 80,
    defenderHpPct: 40,
    moveNumber: 3,
    ...overrides,
  };
}

// Fixed rng for deterministic tests.
function fixedRng(value) {
  return () => value;
}

// --- fallbackLine: non-empty, <=25 words, includes attacker's name ---
const cases = {
  ko: baseInput({ ko: true }),
  crit: baseInput({ crit: true }),
  superEffective: baseInput({ superEffective: true }),
  normal: baseInput(),
};

for (const [name, input] of Object.entries(cases)) {
  const line = fallbackLine(input, fixedRng(0.42));
  check(`fallbackLine(${name}) is a non-empty string`, typeof line === "string" && line.length > 0);
  check(`fallbackLine(${name}) is <= 25 words (got ${wordCount(line)}): "${line}"`, wordCount(line) <= 25);
  check(`fallbackLine(${name}) includes the attacker's name`, line.includes(input.attackerName));
}

// --- deterministic with fixed rng ---
{
  const input = baseInput({ crit: true });
  const a = fallbackLine(input, fixedRng(0.17));
  const b = fallbackLine(input, fixedRng(0.17));
  check("fallbackLine is deterministic with a fixed rng", a === b);
}

// Sanity: different rng values should be able to produce different lines
// across the pool (not a strict requirement, just informative).
{
  const input = baseInput();
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    seen.add(fallbackLine(input, fixedRng(i / 9)));
  }
  check("fallbackLine varies across rng values (pool has variety)", seen.size >= 4);
}

// --- buildNarratePrompt ---
{
  const input = baseInput();
  const prompt = buildNarratePrompt(input);
  check("buildNarratePrompt includes the move name", prompt.includes(input.moveName));
  check(`buildNarratePrompt is under 1000 chars (got ${prompt.length})`, prompt.length < 1000);
}
{
  const koInput = baseInput({ ko: true });
  const koPrompt = buildNarratePrompt(koInput);
  check(
    'buildNarratePrompt mentions the finish for KO inputs (contains "finish")',
    koPrompt.toLowerCase().includes("finish"),
  );
}

// --- cleanLine ---
{
  const cleaned = cleanLine('  "**WHAT A HIT!**"  ');
  check(`cleanLine strips quotes and markdown (got "${cleaned}")`, cleaned === "WHAT A HIT!");
}
{
  const long = "word ".repeat(100).trim();
  const cleaned = cleanLine(long);
  check(`cleanLine cuts to 220 chars at a word boundary (got ${cleaned.length} chars)`, cleaned.length <= 220);
  check("cleanLine does not cut mid-word", !cleaned.endsWith("wor") && !cleaned.endsWith("wo"));
}
{
  const cleaned = cleanLine("  lots   of   spaces   here  ");
  check(`cleanLine collapses whitespace (got "${cleaned}")`, cleaned === "lots of spaces here");
}

// --- Print 6 sample fallback lines for human judgment ---
console.log("\nSample fallback lines:");
const sampleInputs = [
  baseInput({ ko: true }),
  baseInput({ ko: true, attackerName: "Sir Toasts-a-Lot", attackerObject: "toaster" }),
  baseInput({ crit: true }),
  baseInput({ superEffective: true }),
  baseInput(),
  baseInput({ attackerName: "The Rizzler Remote", attackerObject: "TV remote", damage: 12 }),
];
sampleInputs.forEach((input, i) => {
  const line = fallbackLine(input, fixedRng((i + 1) / (sampleInputs.length + 1)));
  console.log(`  ${i + 1}. ${line}`);
});

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
