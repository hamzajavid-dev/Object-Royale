// Shared contract for every part of Object Royale. Owned by the lead; agents read only.

export type MoveType = "heat" | "sharp" | "electric" | "liquid" | "blunt" | "chaos";

// Side effect a move can trigger on top of its damage (engine rules in lib/battle.ts):
// burn   — defender loses 6 HP at the start of each of its next 2 turns
// stun   — defender skips its next turn (engine caps chance at 35)
// shield — attacker takes 50% less damage from the next hit
// heal   — attacker heals 15 HP (never above max)
// drain  — attacker heals 50% of the damage this move dealt
// boost  — attacker's next move deals +30% damage
// weaken — defender's next move deals -30% damage
export type EffectKind = "burn" | "stun" | "shield" | "heal" | "drain" | "boost" | "weaken";
export const EFFECT_KINDS: readonly EffectKind[] = ["burn", "stun", "shield", "heal", "drain", "boost", "weaken"];

export type MoveEffect = {
  kind: EffectKind;
  chance: number;        // 0–100, % chance the effect triggers when the move lands
};

export type Move = {
  name: string;          // "Scalding Splash"
  type: MoveType;
  power: number;         // 10–35
  description: string;   // one short funny line
  isSpecial?: boolean;   // exactly one per fighter (the last move); usable once per battle
  effect?: MoveEffect;   // optional side effect
};

// Passive ability, always on during a battle (engine rules in lib/battle.ts):
// thick_skin   — takes 15% less damage
// hothead      — deals +20% damage while below 50% HP
// lucky        — crit chance 25% instead of 10%
// regen        — heals 4 HP at the start of each of its own turns
// thorns       — reflects 20% of damage taken back at the attacker
// first_strike — its first move of the battle deals +50% damage
// last_stand   — once per battle, survives a lethal hit with 1 HP
export type AbilityKind =
  | "thick_skin" | "hothead" | "lucky" | "regen" | "thorns" | "first_strike" | "last_stand";
export const ABILITY_KINDS: readonly AbilityKind[] = [
  "thick_skin", "hothead", "lucky", "regen", "thorns", "first_strike", "last_stand",
];

export type Ability = {
  name: string;          // flavoured per object: "Ceramic Hide" (kind thick_skin) for a mug
  description: string;   // one short line, max 12 words
  kind: AbilityKind;
};

export type Fighter = {
  id: string;
  objectName: string;    // what it really is: "chai cup"
  fighterName: string;   // "Chai Titan"
  emoji: string;         // "☕"
  title: string;         // "The Steaming Menace"
  catchphrase: string;   // "You're about to get steeped."
  hp: number;            // 60–120
  type: MoveType;
  weakness: MoveType;    // never the same as its own type
  moves: Move[];         // move pool: 4 normal moves, then 1 special LAST (5 total)
  abilities: Ability[];  // exactly 2 options; the player equips one in the loadout
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0–1000
  imageUrl?: string;     // cropped photo portrait
};

// What the player customised before the fight.
export type Loadout = {
  moveIndices: number[]; // indices into fighter.moves of the chosen NORMAL moves (3, or fewer if the pool is small)
  abilityIndex: number;  // index into fighter.abilities
};

export type Arena = {
  arenaName: string;     // "The Desk of Destiny"
  fighters: Fighter[];   // 4–6
};

export const MOVE_TYPES: readonly MoveType[] = ["heat", "sharp", "electric", "liquid", "blunt", "chaos"];
