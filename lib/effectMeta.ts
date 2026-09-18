import type { AbilityKind, EffectKind } from "./types";

// Display text for move effects and passive abilities. Shared by every screen
// so the rules read the same everywhere. Owned by the lead.

export const EFFECT_META: Record<EffectKind, { icon: string; label: string; rule: string }> = {
  burn:   { icon: "🔥", label: "BURN",   rule: "Foe loses 6 HP for 2 turns" },
  stun:   { icon: "💫", label: "STUN",   rule: "Foe skips its next turn" },
  shield: { icon: "🛡️", label: "SHIELD", rule: "Halves the next hit you take" },
  heal:   { icon: "✚",  label: "HEAL",   rule: "Restore 15 HP" },
  drain:  { icon: "🩸", label: "DRAIN",  rule: "Heal half the damage dealt" },
  boost:  { icon: "⏫", label: "BOOST",  rule: "Your next move +30% damage" },
  weaken: { icon: "⏬", label: "WEAKEN", rule: "Foe's next move −30% damage" },
};

export const ABILITY_META: Record<AbilityKind, { icon: string; rule: string }> = {
  thick_skin:   { icon: "🧱", rule: "Takes 15% less damage" },
  hothead:      { icon: "😤", rule: "+20% damage below half HP" },
  lucky:        { icon: "🍀", rule: "Crits 25% of the time" },
  regen:        { icon: "🌱", rule: "Heals 4 HP every turn" },
  thorns:       { icon: "🌵", rule: "Reflects 20% of damage taken" },
  first_strike: { icon: "⚡", rule: "First move deals +50%" },
  last_stand:   { icon: "🪦", rule: "Survives one lethal hit at 1 HP" },
};

/** "BURN 40%" style tag for a move's effect. */
export function effectTag(kind: EffectKind, chance: number): string {
  return chance >= 100 ? EFFECT_META[kind].label : `${EFFECT_META[kind].label} ${chance}%`;
}
