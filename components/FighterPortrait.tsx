import type { Fighter } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/typeStyles";

type FighterPortraitProps = {
  fighter: Fighter;
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
};

// Contract (shared with 11a/11c): sm 64, md 104, lg 148, xl 220 px.
const SIZE_PX: Record<FighterPortraitProps["size"], number> = {
  sm: 64,
  md: 104,
  lg: 148,
  xl: 220,
};

const EMOJI_TEXT: Record<FighterPortraitProps["size"], string> = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
  xl: "text-[110px]",
};

/**
 * Cut-out poster portrait: a thick ink frame, a slight rotation, and a hard
 * shadow, like it was scissored out of a magazine and taped onto the poster.
 * With a photo: a type-coloured halftone overlay at ~25% opacity.
 * Without one: the emoji sits large on a type-coloured halftone field.
 */
export default function FighterPortrait({ fighter, size, className = "" }: FighterPortraitProps) {
  const style = TYPE_STYLES[fighter.type];
  const px = SIZE_PX[size];

  return (
    <div
      className={`relative -rotate-2 shrink-0 overflow-hidden border-[3px] border-ink bg-card shadow-hard ${className}`}
      style={{ width: px, height: px }}
    >
      {fighter.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- portrait source is a data/blob URL from the scan step, not a static asset */}
          <img
            src={fighter.imageUrl}
            alt={fighter.objectName}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className={`halftone pointer-events-none absolute inset-0 opacity-25 ${style.text}`} aria-hidden />
        </>
      ) : (
        <div className={`relative flex h-full w-full items-center justify-center ${style.bg}`}>
          <div className="halftone pointer-events-none absolute inset-0 text-ink opacity-15" aria-hidden />
          <span
            role="img"
            aria-label={fighter.objectName}
            className={`relative select-none leading-none ${EMOJI_TEXT[size]}`}
          >
            {fighter.emoji}
          </span>
        </div>
      )}
    </div>
  );
}
