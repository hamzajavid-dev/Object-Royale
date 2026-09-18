import type { MoveType } from "./types";

export const TYPE_STYLES: Record<MoveType, { label: string; icon: string; bg: string; text: string; border: string; glow: string }> = {
  heat:     { label: "HEAT",     icon: "🔥", bg: "bg-type-heat",     text: "text-type-heat",     border: "border-type-heat",     glow: "shadow-[0_0_24px_rgba(249,115,22,.55)]" },
  sharp:    { label: "SHARP",    icon: "🗡️", bg: "bg-type-sharp",    text: "text-type-sharp",    border: "border-type-sharp",    glow: "shadow-[0_0_24px_rgba(203,213,225,.5)]" },
  electric: { label: "ELECTRIC", icon: "⚡", bg: "bg-type-electric", text: "text-type-electric", border: "border-type-electric", glow: "shadow-[0_0_24px_rgba(250,204,21,.55)]" },
  liquid:   { label: "LIQUID",   icon: "💧", bg: "bg-type-liquid",   text: "text-type-liquid",   border: "border-type-liquid",   glow: "shadow-[0_0_24px_rgba(56,189,248,.55)]" },
  blunt:    { label: "BLUNT",    icon: "🔨", bg: "bg-type-blunt",    text: "text-type-blunt",    border: "border-type-blunt",    glow: "shadow-[0_0_24px_rgba(168,162,158,.5)]" },
  chaos:    { label: "CHAOS",    icon: "🌀", bg: "bg-type-chaos",    text: "text-type-chaos",    border: "border-type-chaos",    glow: "shadow-[0_0_24px_rgba(168,85,247,.55)]" },
};
