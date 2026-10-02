import { useState, type CSSProperties } from "react";
import stampsData from "../../data/stamps.json";
import type { Stamp } from "../../types/content";

/**
 * Sticker artwork lives as image files in public/assets/stamps/ (paths in stamps.json),
 * so it can be edited in any design tool and saved over the old file.
 */
const STICKER_FALLBACK = "/assets/stamps/fallback.svg";
const SEAL_IMAGE = "/assets/stamps/certified-explorer.svg";

const stampsById = new Map((stampsData as Stamp[]).map((stamp) => [stamp.id, stamp]));

interface StickerProps {
  stampId: string;
  name: string;
  /** Rendered size in px. */
  size?: number;
  /** Plays the "slap onto the page" animation, with the colour washing in. */
  animate?: boolean;
  /** Not collected yet: shown in faded black and white. */
  locked?: boolean;
  /** Slight resting tilt, in degrees, so a page of stickers looks hand-placed. */
  tilt?: number;
  className?: string;
}

/** A die-cut sticker for a stamp, drawn from its image file. */
export function Sticker({ stampId, name, size = 132, animate = false, locked = false, tilt = 0, className }: StickerProps) {
  const stamp = stampsById.get(stampId);
  const [failed, setFailed] = useState(false);
  const src = !stamp?.image || failed ? STICKER_FALLBACK : stamp.image;

  return (
    <span
      className={["sticker", className].filter(Boolean).join(" ")}
      data-animate={(animate && !locked) || undefined}
      data-locked={locked || undefined}
      data-holo={(stamp?.holo && !locked) || undefined}
      style={{ width: size, height: size, "--sticker-tilt": `${tilt}deg` } as CSSProperties}
    >
      <img
        src={src}
        alt={locked ? `${name} sticker, not collected yet` : `${name} sticker`}
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/** Gold rosette shown once every stamp is collected. */
export function CompletionSeal({ size = 180, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <span className="completion-seal" data-animate={animate || undefined} style={{ width: size, height: size }}>
      <img src={SEAL_IMAGE} alt="MEC E Certified Explorer seal" width={size} height={size} draggable={false} />
    </span>
  );
}
