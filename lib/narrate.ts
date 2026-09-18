// Shared narration logic — no runtime imports, no enums, so this file can be
// imported directly by a Node test script (scripts/test-narrate.mjs) as well
// as by the API route and the browser client.

export type NarrateInput = {
  attackerName: string; // "Chai Titan"
  attackerObject: string; // "chai cup"
  defenderName: string;
  defenderObject: string;
  moveName: string;
  moveDescription: string;
  damage: number;
  superEffective: boolean;
  crit: boolean;
  ko: boolean;
  attackerHpPct: number; // 0-100 after the move
  defenderHpPct: number; // 0-100 after the move
  moveNumber: number; // 1-based
  effectLabel?: string; // e.g. "BURNED!" — set when the move triggered a side effect
};

function fillTemplate(template: string, i: NarrateInput): string {
  return template
    .split("{attacker}")
    .join(i.attackerName)
    .split("{attackerObject}")
    .join(i.attackerObject)
    .split("{defender}")
    .join(i.defenderName)
    .split("{defenderObject}")
    .join(i.defenderObject)
    .split("{move}")
    .join(i.moveName)
    .split("{damage}")
    .join(String(i.damage))
    .split("{effect}")
    .join(i.effectLabel ?? "");
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  const r = rng();
  const safe = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.999999999) : 0;
  const idx = Math.floor(safe * arr.length);
  return arr[idx] ?? arr[0];
}

const KO_LINES: readonly string[] = [
  "{attacker} lands {move} and it's LIGHTS OUT for {defender}! That's a KNOCKOUT, folks!",
  "{defender} goes down in a heap! {attacker}'s {move} closes the show completely!",
  "OH MY WORD! {move} from {attacker} and {defender} is DONE. Match over!",
  "{attacker} just filed {defender}'s retirement papers with one thunderous {move}. KO!",
  "That's all she wrote! {move} sends {defender} packing. {attacker} wins it clean!",
  "{defender} has left the building, courtesy of {attacker}'s bone-rattling {move}. Knockout!",
  "Ladies and gentlemen, {attacker} just ended an era with {move}. {defender} is finished!",
  "{attacker} delivers {move} like a closing argument. {defender} has no rebuttal. KNOCKOUT!",
  "Somebody call for backup, {defender} is not getting up after {attacker}'s {move}!",
  "{attacker} spikes the mic with {move}! {defender} is toast, done, finished. KO!",
];

const CRIT_LINES: readonly string[] = [
  "CRITICAL HIT! {attacker}'s {move} finds the exact weak spot for {damage} damage!",
  "Ooh, that's a nasty one! {attacker}'s {move} lands clean, critical strike, {damage} damage!",
  "{attacker} threads the needle with {move}. CRITICAL! {defender} did not see that coming.",
  "Textbook precision from {attacker}! {move} crits for {damage}, {defender} will feel that in the morning.",
  "The crowd gasps! {attacker}'s {move} hits a critical weak point for {damage} damage!",
  "That's a bullseye! {move} critically strikes {defender} for {damage}, brutal work from {attacker}!",
  "CRUNCH! {attacker} finds the sweet spot with {move}, {damage} critical damage!",
  "{defender} winces hard, {attacker}'s {move} just crit for {damage}! Somebody get the ice.",
  "Precision like a surgeon! {attacker}'s {move} critically strikes for {damage} damage!",
];

const SUPER_LINES: readonly string[] = [
  "{move} is SUPER effective! {attacker} exploits {defender}'s weakness for {damage} damage!",
  "Oh, {defender} really did not want to see {attacker}'s {move}. Super effective, {damage} damage!",
  "{attacker} knows exactly where it hurts! {move} is super effective for {damage} on {defender}!",
  "That's the matchup nightmare! {attacker}'s {move} tears through {defender} for {damage} super-effective damage!",
  "{defender}'s weakness exposed! {attacker}'s {move} connects for a brutal {damage}!",
  "Type advantage city! {attacker}'s {move} smashes {defender} for {damage} damage, super effective!",
  "{attacker} read the matchup perfectly. {move} lands super effective for {damage}!",
  "Weakness located and exploited! {attacker}'s {move} deals {damage} super-effective damage to {defender}!",
];

const EFFECT_LINES: readonly string[] = [
  "{attacker}'s {move} connects for {damage}, and now {defender} is {effect} Rough spot to be in!",
  "{damage} damage from {move}, plus {defender} is left {effect} {attacker} is playing dirty tonight!",
  "That's {damage} damage AND {defender} is {effect} {attacker}'s {move} does it all!",
];

const NORMAL_LINES: readonly string[] = [
  "{attacker} fires off {move}! {defender} takes {damage} damage and is not thrilled about it.",
  "{attacker}'s {move} connects! {defender} absorbs {damage} damage, still standing but rattled.",
  "{attacker} unleashes {move}! {defender} takes {damage} and questions every life choice.",
  "Solid hit from {attacker}! {move} does {damage} damage to {defender}.",
  "{defender} takes {damage} from {attacker}'s {move}. This fight is heating up nicely!",
  "{attacker} keeps the pressure on! {move} lands for {damage} damage.",
  "{attacker}'s {move} clips {defender} for {damage}, nothing decisive yet but the crowd is loving it!",
  "{attacker} swings with {move}, {defender} eats {damage} damage and shakes it off, barely.",
  "That's {damage} damage from {move}! {attacker} is not messing around today.",
];

/**
 * Instant, template-based line used whenever the AI is unavailable, slow, or
 * out of credit. Picks randomly (via the given rng, defaulting to
 * Math.random) from the pool matching the most dramatic situation present.
 */
export function fallbackLine(i: NarrateInput, rng: () => number = Math.random): string {
  const pool = i.ko
    ? KO_LINES
    : i.crit
      ? CRIT_LINES
      : i.superEffective
        ? SUPER_LINES
        : i.effectLabel
          ? EFFECT_LINES
          : NORMAL_LINES;
  const template = pick(pool, rng);
  return fillTemplate(template, i);
}

/**
 * Builds a short prompt for a hype, funny esports/cricket-style commentator
 * describing the move that just happened.
 */
export function buildNarratePrompt(i: NarrateInput): string {
  const tone = i.ko
    ? "This move is the KNOCKOUT. Deliver a dramatic, over-the-top finishing call."
    : i.crit
      ? "This was a critical hit. Sound genuinely shocked and hyped."
      : i.superEffective
        ? "This move was super effective. Lean into the type advantage."
        : "Call this move with energy, like every hit matters.";

  return [
    "You are a hype esports and cricket commentator who is also a stand-up comic, calling a battle between everyday objects.",
    `${i.attackerName} (a ${i.attackerObject}) used "${i.moveName}" (${i.moveDescription}) on ${i.defenderName} (a ${i.defenderObject}), dealing ${i.damage} damage.`,
    `This is move #${i.moveNumber}. ${i.attackerName} is at ${i.attackerHpPct}% HP and ${i.defenderName} is at ${i.defenderHpPct}% HP.`,
    i.effectLabel ? `The move also triggered an effect: ${i.effectLabel}. Mention it.` : "",
    tone,
    "Rules: one or two sentences, 25 words max. Output ONLY the line, no quotes, no emojis, no names in brackets, no stage directions. Reference what these objects really are for jokes (a chai cup is hot, a laptop has updates and a battery).",
  ].join(" ");
}

const OPENING_QUOTE_CHARS = new Set(['"', "'", "“", "‘", "`"]);
const CLOSING_QUOTE_CHARS = new Set(['"', "'", "”", "’", "`"]);

/**
 * Cleans up raw AI output: trims, strips surrounding quotes and markdown
 * emphasis markers, collapses whitespace, and cuts to 220 chars at a word
 * boundary.
 */
export function cleanLine(text: string): string {
  let s = (text ?? "").trim();

  // Strip markdown bold/italic emphasis markers.
  s = s.split("**").join("").split("__").join("");
  s = s.trim();

  // Strip surrounding quote characters, possibly nested.
  let strippedSomething = true;
  while (strippedSomething && s.length > 1) {
    strippedSomething = false;
    const first = s[0];
    const last = s[s.length - 1];
    if (OPENING_QUOTE_CHARS.has(first) && CLOSING_QUOTE_CHARS.has(last)) {
      s = s.slice(1, -1).trim();
      strippedSomething = true;
    }
  }

  // Remove any remaining stray leading markdown bullet/asterisk characters.
  s = s.replace(/^[*_#>\s-]+/, "").trim();

  // Collapse internal whitespace.
  s = s.replace(/\s+/g, " ").trim();

  // Cut to 220 chars at a word boundary.
  if (s.length > 220) {
    const cut = s.slice(0, 220);
    const lastSpace = cut.lastIndexOf(" ");
    s = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
  }

  return s;
}
