// Server-side scan logic: the vision prompt, its JSON schema, and normalization
// of whatever the model returns into a safe-to-play Arena.
//
// IMPORTANT: this file must only use `import type` (no runtime imports) and no
// `enum`s, so it can be loaded directly by Node's TypeScript type-stripping in
// scripts/test-normalize.mjs.

import type { Arena, Fighter, Move, MoveType } from "./types";

const MOVE_TYPES: MoveType[] = ["heat", "sharp", "electric", "liquid", "blunt", "chaos"];

export const SCAN_PROMPT = `You are the announcer and game designer of OBJECT ROYALE, a fighting game where everyday objects come to life and battle for glory.

Look at the photo and find 4 to 6 distinct, clearly visible physical objects. Prefer objects with personality — cups, laptops, bottles, phones, pens, bags, plants, snacks — and prefer objects that don't overlap much so their crops look clean.

Never include people, faces, body parts, pets, or anything showing personal information (screens with readable text, documents, ID cards, license plates). If a person is visible, ignore them and scan the objects around them instead.

For each object:
- box_2d: [ymin, xmin, ymax, xmax], integers normalized to 0-1000, fitting tightly around the object.
- Base its fighter type, weakness and moves on its REAL physical properties. A hot drink is "heat" and weak to "blunt". A laptop or phone is "electric" and weak to "liquid". Paper or cardboard is weak to "heat". Scissors, keys or a stapler are "sharp".
- type and weakness must each be exactly one of: heat, sharp, electric, liquid, blunt, chaos. weakness must never equal type.
- Exactly 3 moves: two normal moves (power 10-25) and one special finishing move (power 30-35, isSpecial: true). At least one move's type differs from the fighter's own type.
- hp: 60-120. Sturdy, heavy or solid objects get more hp; flimsy or small ones get less.
- Tone: witty, punny, PG, like a hype esports announcer working up a crowd. Descriptions max 12 words. Catchphrases max 10 words.
- If fewer than 4 clear objects are visible, invent playful extra fighters from background elements (the table, the wall, a lamp) — still give them real, tight boxes.

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
    { "name": "Scalding Splash", "description": "Douses the foe in molten espresso fury.", "type": "heat", "power": 18, "isSpecial": false },
    { "name": "Rim Shot", "description": "A quick chip to the shins, ceramic style.", "type": "blunt", "power": 14, "isSpecial": false },
    { "name": "Full Boil Meltdown", "description": "Erupts in a steam explosion of pure vengeance.", "type": "heat", "power": 33, "isSpecial": true }
  ]
}

Reply with JSON only, matching the schema exactly. No markdown, no commentary, no text before or after the JSON.`;

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
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                type: { type: "string", enum: MOVE_TYPES },
                power: { type: "integer" },
                isSpecial: { type: "boolean" },
              },
              required: ["name", "description", "type", "power", "isSpecial"],
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
];

function isValidMoveInput(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const name = (value as Record<string, unknown>).name;
  return typeof name === "string" && name.trim().length > 0;
}

function buildMoves(rawMoves: unknown): Move[] {
  const list = Array.isArray(rawMoves) ? rawMoves : [];
  const valid = list.filter(isValidMoveInput);

  const padded: Record<string, unknown>[] = [...valid];
  let padIndex = 0;
  while (padded.length < 3) {
    padded.push(PAD_MOVES[padIndex % PAD_MOVES.length]);
    padIndex++;
  }
  const trimmed = padded.slice(0, 3);

  return trimmed.map((raw, index) => {
    const isLast = index === trimmed.length - 1;
    const type = resolveType(raw.type);
    const name = cleanString(raw.name, 30, isLast ? "Finishing Blow" : "Basic Strike");
    const description = cleanString(raw.description, 80, "Does something surprisingly effective.");
    const powerRaw = typeof raw.power === "number" ? raw.power : Number(raw.power);
    const power = isLast
      ? clampInt(Number.isFinite(powerRaw) ? powerRaw : 32, 30, 35)
      : clampInt(Number.isFinite(powerRaw) ? powerRaw : 15, 10, 25);

    const move: Move = { name, description, type, power, isSpecial: isLast };
    return move;
  });
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
      box: candidate.box,
    };
    return fighter;
  });

  return {
    arenaName: cleanString(obj.arenaName, 80, "The Mystery Arena"),
    fighters,
  };
}
