// Shared contract for every part of Object Royale. Owned by the lead; agents read only.

export type MoveType = "heat" | "sharp" | "electric" | "liquid" | "blunt" | "chaos";

export type Move = {
  name: string;          // "Scalding Splash"
  type: MoveType;
  power: number;         // 10–35
  description: string;   // one short funny line
  isSpecial?: boolean;   // exactly one per fighter; usable once per battle
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
  moves: Move[];         // exactly 3: two normal + one special (the last one)
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0–1000 — filled by AI in step 05
  imageUrl?: string;     // cropped photo portrait — filled in step 05
};

export type Arena = {
  arenaName: string;     // "The Desk of Destiny"
  fighters: Fighter[];   // 4–6
};

export const MOVE_TYPES: readonly MoveType[] = ["heat", "sharp", "electric", "liquid", "blunt", "chaos"];
