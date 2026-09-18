import type { Fighter } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/typeStyles";

type FighterPortraitProps = {
  fighter: Fighter;
  size: "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<FighterPortraitProps["size"], string> = {
  sm: "w-[72px] h-[72px] text-4xl",
  md: "w-[112px] h-[112px] text-6xl",
  lg: "w-[160px] h-[160px] text-8xl",
};

const GRADIENT_STYLES: Record<Fighter["type"], { backgroundImage: string }> = {
  heat: { backgroundImage: "radial-gradient(circle, rgba(249,115,22,.35), #0a0a12 75%)" },
  sharp: { backgroundImage: "radial-gradient(circle, rgba(203,213,225,.35), #0a0a12 75%)" },
  electric: { backgroundImage: "radial-gradient(circle, rgba(250,204,21,.35), #0a0a12 75%)" },
  liquid: { backgroundImage: "radial-gradient(circle, rgba(56,189,248,.35), #0a0a12 75%)" },
  blunt: { backgroundImage: "radial-gradient(circle, rgba(168,162,158,.35), #0a0a12 75%)" },
  chaos: { backgroundImage: "radial-gradient(circle, rgba(168,85,247,.35), #0a0a12 75%)" },
};

export default function FighterPortrait({ fighter, size }: FighterPortraitProps) {
  const style = TYPE_STYLES[fighter.type];

  return (
    <div
      className={`${SIZE_CLASSES[size]} ${style.border} shrink-0 rounded-xl border-2 overflow-hidden flex items-center justify-center mx-auto`}
      style={fighter.imageUrl ? undefined : GRADIENT_STYLES[fighter.type]}
    >
      {fighter.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- portrait source is a data/blob URL from the scan step, not a static asset
        <img
          src={fighter.imageUrl}
          alt={fighter.objectName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span role="img" aria-label={fighter.objectName} className="leading-none select-none">
          {fighter.emoji}
        </span>
      )}
    </div>
  );
}
