// Server-side scan logic: the vision prompt, its JSON schema, and normalization
// of whatever the model returns into a safe-to-play Arena.
//
// IMPORTANT: this file must only use `import type` (no runtime imports) and no
// `enum`s, so it can be loaded directly by Node's TypeScript type-stripping in
// scripts/test-normalize.mjs.

import type { Ability, AbilityKind, Arena, EffectKind, Fighter, Move, MoveEffect, MoveType } from "./types";

const MOVE_TYPES: MoveType[] = ["heat", "sharp", "electric", "liquid", "blunt", "chaos"];
const EFFECT_KINDS: EffectKind[] = ["burn", "stun", "shield", "heal", "drain", "boost", "weaken"];
const ABILITY_KINDS: AbilityKind[] = [
  "thick_skin",
  "hothead",
  "lucky",
  "regen",
  "thorns",
  "first_strike",
  "last_stand",
];

export const SCAN_PROMPT = `You are the announcer and game designer of OBJECT ROYALE, a fighting game where everyday objects come to life and battle for glory.

Look at the photo and find 4 to 6 distinct, clearly visible physical objects. Prefer objects with personality — cups, laptops, bottles, phones, pens, bags, plants, snacks — and prefer objects that don't overlap much so their crops look clean.

Never include people, faces, body parts, pets, or anything showing personal information (screens with readable text, documents, ID cards, license plates). If a person is visible, ignore them and scan the objects around them instead.

For each object:
- box_2d: [ymin, xmin, ymax, xmax], integers normalized to 0-1000, fitting tightly around the object.
- Base its fighter type, weakness and moves on its REAL physical properties. A hot drink is "heat" and weak to "blunt". A laptop or phone is "electric" and weak to "liquid". Paper or cardboard is weak to "heat". Scissors, keys or a stapler are "sharp".
- type and weakness must each be exactly one of: heat, sharp, electric, liquid, blunt, chaos. weakness must never equal type.
- hp: 60-120. Sturdy, heavy or solid objects get more hp; flimsy or small ones get less.
- Tone: witty, punny, PG, like a hype esports announcer working up a crowd. Descriptions max 12 words. Catchphrases max 10 words.
- If fewer than 4 clear objects are visible, invent playful extra fighters from background elements (the table, the wall, a lamp) — still give them real, tight boxes.

Moves: give each fighter EXACTLY 5 moves — 4 normal moves (power 10-25) and 1 special finishing move LAST (power 30-35, isSpecial: true). At least 3 of the 5 moves (across normal and special) must carry a side effect. An effect has a "kind" (one of burn, stun, shield, heal, drain, boost, weaken) and a "chance" (20-100, the percent chance it triggers when the move lands). Moves that heal or shield should have lower power (8-14) since the effect is the payoff.

Effect rules (so you know what each one does):
- burn: defender loses 6 HP at the start of each of its next 2 turns.
- stun: defender skips its next turn (real chance is capped at 35 by the engine, so any value is fine).
- shield: the attacker takes 50% less damage on the next hit it takes.
- heal: the attacker heals 15 HP.
- drain: the attacker heals 50% of the damage this move just dealt.
- boost: the attacker's next move deals +30% damage.
- weaken: the defender's next move deals -30% damage.

Pick effects that make sense for the REAL object. Examples: a hot drink or toaster → burn ("scalding splash", "hot coils"). A phone or laptop → stun ("notification barrage", "forced update"). A water bottle or houseplant → heal ("hydration boost", "photosynthesis"). A mug or hardcover book → shield ("thick ceramic wall", "slams shut"). Scissors, a pen or a stapler → drain ("paper cut", "ink drain"). Coffee, an energy drink or a spicy snack → boost ("caffeine rush", "sugar high"). A pillow, a sock or a soft toy → weaken ("muffling hug", "sleepy fog").

Abilities: give each fighter EXACTLY 2 passive abilities, always-on, with DIFFERENT kinds chosen from: thick_skin, hothead, lucky, regen, thorns, first_strike, last_stand. Rules for each kind:
- thick_skin: takes 15% less damage.
- hothead: deals +20% damage while below 50% HP.
- lucky: crit chance is 25% instead of 10%.
- regen: heals 4 HP at the start of each of its own turns.
- thorns: reflects 20% of damage taken back at the attacker.
- first_strike: its first move of the battle deals +50% damage.
- last_stand: once per battle, survives a lethal hit with 1 HP instead of fainting.
Give each ability an object-flavoured name (a mug's thick_skin might be "Ceramic Hide", a phone's lucky might be "Full Battery Luck") and a description of at most 12 words explaining the flavour.

Also invent arenaName: a dramatic name for the scene itself, like "The Desk of Destiny" or "Café Colosseum".

Example of one ideal fighter (for a ceramic mug of coffee), showing the tone and structure to match exactly:
{
  "objectName": "coffee mug",
  "fighterName": "Mug Marauder",
  "emoji": "☕",
  "title": "The Steaming Menace",
  "catchphrase": "Hope you like it scalding.",
  "hp": 85,
  "type": "heat",
  "weakness": "blunt",
  "box_2d": [120, 430, 380, 620],
  "moves": [
    { "name": "Scalding Splash", "description": "Douses the foe in molten espresso fury.", "type": "heat", "power": 18, "isSpecial": false, "effect": { "kind": "burn", "chance": 55 } },
    { "name": "Rim Shot", "description": "A quick chip to the shins, ceramic style.", "type": "blunt", "power": 14, "isSpecial": false, "effect": null },
    { "name": "Steam Wall", "description": "Vents scalding steam to shield itself.", "type": "heat", "power": 10, "isSpecial": false, "effect": { "kind": "shield", "chance": 50 } },
    { "name": "Caffeine Jolt", "description": "A jittery burst of pure espresso confidence.", "type": "chaos", "power": 16, "isSpecial": false, "effect": { "kind": "boost", "chance": 35 } },
    { "name": "Full Boil Meltdown", "description": "Erupts in a steam explosion of pure vengeance.", "type": "heat", "power": 33, "isSpecial": true, "effect": { "kind": "burn", "chance": 40 } }
  ],
  "abilities": [
    { "name": "Ceramic Hide", "description": "Its thick mug walls shrug off incoming hits.", "kind": "thick_skin" },
    { "name": "Second Wind Sip", "description": "One reckless sip survives a hit that should've ended it.", "kind": "last_stand" }
  ]
}

Reply with JSON only, matching the schema exactly. No markdown, no commentary, no text before or after the JSON.`;

const EFFECT_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        kind: { type: "string", enum: EFFECT_KINDS },
        chance: { type: "integer" },
      },
      required: ["kind", "chance"],
      additionalProperties: false,
    },
    { type: "null" },
  ],
} as const;

export const SCAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    arenaName: { type: "string" },
    fighters: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          objectName: { type: "string" },
          fighterName: { type: "string" },
          emoji: { type: "string" },
          title: { type: "string" },
          catchphrase: { type: "string" },
          hp: { type: "integer" },
          type: { type: "string", enum: MOVE_TYPES },
          weakness: { type: "string", enum: MOVE_TYPES },
          box_2d: {
            type: "array",
            items: { type: "integer" },
            minItems: 4,
            maxItems: 4,
          },
          moves: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                type: { type: "string", enum: MOVE_TYPES },
                power: { type: "integer" },
                isSpecial: { type: "boolean" },
                effect: EFFECT_SCHEMA,
              },
              required: ["name", "description", "type", "power", "isSpecial", "effect"],
              additionalProperties: false,
            },
          },
          abilities: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                kind: { type: "string", enum: ABILITY_KINDS },
              },
              required: ["name", "description", "kind"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "objectName",
          "fighterName",
          "emoji",
          "title",
          "catchphrase",
          "hp",
          "type",
          "weakness",
          "box_2d",
          "moves",
          "abilities",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["arenaName", "fighters"],
  additionalProperties: false,
} as const;

/** Strips a markdown fence if present, then parses JSON, falling back to the
 * substring between the first `{` and the last `}`. Throws if nothing parses. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fall through to throw below
      }
    }
    throw new Error("Could not parse JSON from model output");
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

function cleanString(value: unknown, maxLen: number, fallback: string): string {
  const str = typeof value === "string" ? value.trim() : "";
  const cut = str.slice(0, maxLen).trim();
  return cut.length > 0 ? cut : fallback;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "fighter";
}

function makeUniqueId(name: string, used: Map<string, number>): string {
  const base = slugify(name);
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function resolveType(value: unknown): MoveType {
  const str = typeof value === "string" ? value.toLowerCase().trim() : "";
  return (MOVE_TYPES as string[]).includes(str) ? (str as MoveType) : "chaos";
}

function resolveWeakness(value: unknown, type: MoveType): MoveType {
  let weakness = resolveType(value);
  if (weakness === type) {
    const idx = MOVE_TYPES.indexOf(type);
    weakness = MOVE_TYPES[(idx + 1) % MOVE_TYPES.length];
  }
  return weakness;
}

function resolveHp(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 90;
  return clampInt(num, 60, 120);
}

function isValidBoxInput(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => Number.isFinite(typeof v === "number" ? v : Number(v)))
  );
}

function normalizeBox(box: unknown[]): [number, number, number, number] {
  const nums = box.map((v) => clampInt(typeof v === "number" ? v : Number(v), 0, 1000));
  const [a, b, c, d] = nums;
  const ymin = Math.min(a, c);
  const ymax = Math.max(a, c);
  const xmin = Math.min(b, d);
  const xmax = Math.max(b, d);
  return [ymin, xmin, ymax, xmax];
}

const PAD_MOVES: Record<string, unknown>[] = [
  { name: "Clumsy Bump", type: "blunt", power: 12, description: "Trips over itself into the opponent." },
  { name: "Wild Flail", type: "chaos", power: 16, description: "Flails wildly, connecting by pure luck." },
  { name: "Desperate Lunge", type: "chaos", power: 14, description: "Lunges forward with more hope than plan." },
  { name: "Scrappy Jab", type: "blunt", power: 13, description: "A scrappy little jab, more spirit than skill." },
];

function isValidMoveInput(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const name = (value as Record<string, unknown>).name;
  return typeof name === "string" && name.trim().length > 0;
}

function resolveEffect(raw: unknown): MoveEffect | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const kindRaw = (raw as Record<string, unknown>).kind;
  const kind = typeof kindRaw === "string" ? kindRaw.trim() : "";
  if (!(EFFECT_KINDS as string[]).includes(kind)) return undefined;
  const chanceRaw = (raw as Record<string, unknown>).chance;
  const chanceNum = typeof chanceRaw === "number" ? chanceRaw : Number(chanceRaw);
  let chance = Number.isFinite(chanceNum) ? clampInt(chanceNum, 0, 100) : 50;
  if (kind === "stun") chance = Math.min(chance, 35);
  return { kind: kind as EffectKind, chance };
}

/** Builds the 4 normal + 1 special move list, guaranteeing at least 3 of 5
 * carry a valid effect where the raw input already supplied one. */
function buildMoves(rawMoves: unknown): Move[] {
  const list = Array.isArray(rawMoves) ? rawMoves : [];
  const valid = list.filter(isValidMoveInput);

  const padded: Record<string, unknown>[] = [...valid];
  let padIndex = 0;
  while (padded.length < 3) {
    padded.push(PAD_MOVES[padIndex % PAD_MOVES.length]);
    padIndex++;
  }
  const trimmed = padded.length > 5 ? padded.slice(0, 5) : padded;

  return trimmed.map((raw, index) => {
    const isLast = index === trimmed.length - 1;
    const type = resolveType(raw.type);
    const name = cleanString(raw.name, 30, isLast ? "Finishing Blow" : "Basic Strike");
    const description = cleanString(raw.description, 80, "Does something surprisingly effective.");
    const powerRaw = typeof raw.power === "number" ? raw.power : Number(raw.power);
    const power = isLast
      ? clampInt(Number.isFinite(powerRaw) ? powerRaw : 32, 30, 35)
      : clampInt(Number.isFinite(powerRaw) ? powerRaw : 15, 10, 25);

    const effect = resolveEffect((raw as Record<string, unknown>).effect);

    const move: Move = { name, description, type, power, isSpecial: isLast };
    if (effect) move.effect = effect;
    return move;
  });
}

const ABILITY_FALLBACKS: Record<MoveType, [Ability, Ability]> = {
  heat: [
    { name: "Boiling Point", kind: "hothead", description: "Runs hotter and hits harder the longer it fights." },
    { name: "Scorch Memory", kind: "first_strike", description: "Its opening blow still carries the first blast of heat." },
  ],
  electric: [
    { name: "Power Surge", kind: "first_strike", description: "Its opening move hits with a jolt of full charge." },
    { name: "Full Battery Luck", kind: "lucky", description: "A charged cell means suspiciously frequent critical hits." },
  ],
  liquid: [
    { name: "Refill", kind: "regen", description: "Tops itself back up a little every single turn." },
    { name: "Reinforced Shell", kind: "thick_skin", description: "Its tough exterior absorbs a chunk of every hit." },
  ],
  sharp: [
    { name: "Keen Edge", kind: "lucky", description: "Its sharpened point finds critical hits more often." },
    { name: "Spiky Bits", kind: "thorns", description: "Careless grabs get punished right back." },
  ],
  blunt: [
    { name: "Solid Build", kind: "thick_skin", description: "Its sturdy frame shrugs off incoming hits." },
    { name: "Built To Last", kind: "last_stand", description: "Too stubborn to break on the first fatal blow." },
  ],
  chaos: [
    { name: "Pure Chaos", kind: "lucky", description: "Unpredictable enough to land a surprising number of crits." },
    { name: "Chaotic Rebound", kind: "thorns", description: "Whatever hits it seems to bounce right back." },
  ],
};

function isValidAbilityInput(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as Record<string, unknown>).kind;
  return typeof kind === "string" && (ABILITY_KINDS as string[]).includes(kind.trim());
}

/** Keeps valid abilities, dedupes by kind, and fills up to 2 from a
 * per-type fallback table so every fighter always has exactly 2. */
function buildAbilities(rawAbilities: unknown, type: MoveType): Ability[] {
  const list = Array.isArray(rawAbilities) ? rawAbilities : [];
  const seenKinds = new Set<AbilityKind>();
  const abilities: Ability[] = [];

  for (const item of list) {
    if (abilities.length >= 2) break;
    if (!isValidAbilityInput(item)) continue;
    const kind = (item.kind as string).trim() as AbilityKind;
    if (seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    abilities.push({
      name: cleanString(item.name, 30, "Mystery Trait"),
      description: cleanString(item.description, 80, "Does something useful in a pinch."),
      kind,
    });
  }

  const fallbacks = ABILITY_FALLBACKS[type] ?? ABILITY_FALLBACKS.chaos;
  let fallbackIndex = 0;
  while (abilities.length < 2 && fallbackIndex < fallbacks.length) {
    const candidate = fallbacks[fallbackIndex];
    fallbackIndex++;
    if (seenKinds.has(candidate.kind)) continue;
    seenKinds.add(candidate.kind);
    abilities.push(candidate);
  }

  // Extremely unlikely fallthrough: if the type's own fallbacks were already
  // used up by duplicate kinds, pull from the full kind list.
  let genericIndex = 0;
  while (abilities.length < 2 && genericIndex < ABILITY_KINDS.length) {
    const kind = ABILITY_KINDS[genericIndex];
    genericIndex++;
    if (seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    abilities.push({ name: "Hidden Trait", description: "A quiet talent that shows up when it counts.", kind });
  }

  return abilities;
}

/** Makes any model output safe to play. Throws only if fewer than 2 usable
 * fighters remain after filtering out unusable entries. */
export function normalizeArena(raw: unknown): Arena {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawFighters = Array.isArray(obj.fighters) ? obj.fighters : [];

  type Candidate = {
    fighterNameRaw: string;
    box: [number, number, number, number];
    source: Record<string, unknown>;
  };

  const candidates: Candidate[] = [];
  for (const item of rawFighters) {
    if (typeof item !== "object" || item === null) continue;
    const f = item as Record<string, unknown>;
    const fighterNameRaw = typeof f.fighterName === "string" ? f.fighterName.trim() : "";
    if (fighterNameRaw.length === 0) continue;
    if (!isValidBoxInput(f.box_2d)) continue;
    const box = normalizeBox(f.box_2d);
    candidates.push({ fighterNameRaw, box, source: f });
  }

  if (candidates.length < 2) {
    throw new Error("Not enough fighters found");
  }

  const capped = candidates.slice(0, 6);
  const usedIds = new Map<string, number>();

  const fighters: Fighter[] = capped.map((candidate) => {
    const f = candidate.source;
    const type = resolveType(f.type);
    const weakness = resolveWeakness(f.weakness, type);
    const fighterName = cleanString(candidate.fighterNameRaw, 30, "Mystery Fighter");
    const id = makeUniqueId(fighterName, usedIds);

    const fighter: Fighter = {
      id,
      objectName: cleanString(f.objectName, 30, "Unknown Object"),
      fighterName,
      emoji: cleanString(f.emoji, 16, "❓"),
      title: cleanString(f.title, 80, "The Unknown Contender"),
      catchphrase: cleanString(f.catchphrase, 80, "Ready to fight."),
      hp: resolveHp(f.hp),
      type,
      weakness,
      moves: buildMoves(f.moves),
      abilities: buildAbilities(f.abilities, type),
      box: candidate.box,
    };
    return fighter;
  });

  return {
    arenaName: cleanString(obj.arenaName, 80, "The Mystery Arena"),
    fighters,
  };
}
