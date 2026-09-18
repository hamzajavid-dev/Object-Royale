import type { MoveType } from "./types";

// Static class lookups (Tailwind v4 needs full class names in source).
// onBg = readable text colour on top of `bg`. `glow` is deprecated (poster style has no glows).
export const TYPE_STYLES: Record<MoveType, { label: string; icon: string; bg: string; text: string; border: string; onBg: string; glow: string }> = {
  heat:     { label: "HEAT",     icon: "🔥", bg: "bg-type-heat",     text: "text-type-heat",     border: "border-type-heat",     onBg: "text-ink",  glow: "" },
  sharp:    { label: "SHARP",    icon: "🗡️", bg: "bg-type-sharp",    text: "text-type-sharp",    border: "border-type-sharp",    onBg: "text-ink",  glow: "" },
  electric: { label: "ELECTRIC", icon: "⚡", bg: "bg-type-electric", text: "text-type-electric", border: "border-type-electric", onBg: "text-ink",  glow: "" },
  liquid:   { label: "LIQUID",   icon: "💧", bg: "bg-type-liquid",   text: "text-type-liquid",   border: "border-type-liquid",   onBg: "text-card", glow: "" },
  blunt:    { label: "BLUNT",    icon: "🔨", bg: "bg-type-blunt",    text: "text-type-blunt",    border: "border-type-blunt",    onBg: "text-card", glow: "" },
  chaos:    { label: "CHAOS",    icon: "🌀", bg: "bg-type-chaos",    text: "text-type-chaos",    border: "border-type-chaos",    onBg: "text-card", glow: "" },
};
