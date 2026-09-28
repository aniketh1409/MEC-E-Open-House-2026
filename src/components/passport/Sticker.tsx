import { useId, type CSSProperties } from "react";
import { fallbackDesign, stickerDesigns } from "./stickerArt";

interface StickerProps {
  stampId: string;
  name: string;
  /** Rendered size in px. */
  size?: number;
  /** Plays the "slap onto the page" animation. */
  animate?: boolean;
  /** Slight resting tilt, in degrees, so a page of stickers looks hand-placed. */
  tilt?: number;
  className?: string;
}

/** A die-cut sticker for a stamp: coloured disc, illustration, and the name curved along the bottom. */
export function Sticker({ stampId, name, size = 132, animate = false, tilt = 0, className }: StickerProps) {
  const design = stickerDesigns[stampId] ?? fallbackDesign;
  const pathId = `sticker-arc-${useId().replace(/:/g, "")}`;
  const label = name.toUpperCase();

  return (
    <span
      className={["sticker", className].filter(Boolean).join(" ")}
      data-animate={animate || undefined}
      data-holo={design.holo || undefined}
      style={{ width: size, height: size, "--sticker-tilt": `${tilt}deg` } as CSSProperties}
    >
      <svg viewBox="0 0 200 200" role="img" aria-label={`${name} sticker`}>
        <defs>
          <path id={pathId} d="M 34 104 A 66 66 0 0 0 166 104" />
        </defs>
        <circle className="sticker-cut" cx={100} cy={100} r={97} />
        <circle cx={100} cy={100} r={87} fill={design.background} />
        <circle cx={100} cy={100} r={80} fill="none" stroke={design.ink} strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="2 5" />
        {design.art}
        <text
          fill={design.ink}
          fontSize={label.length > 20 ? 11.5 : 13.5}
          fontWeight={800}
          letterSpacing={label.length > 20 ? 0.6 : 1.4}
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      </svg>
    </span>
  );
}

/** The dashed outline of a sticker still to collect. */
export function StickerSlot({ size = 132, label }: { size?: number; label: string }) {
  return (
    <span className="sticker-slot" style={{ width: size, height: size }} aria-label={`${label}: not collected yet`} role="img">
      <span aria-hidden="true">?</span>
    </span>
  );
}

/** Gold rosette shown once every stamp is collected. */
export function CompletionSeal({ size = 180, animate = false }: { size?: number; animate?: boolean }) {
  const pathId = `seal-arc-${useId().replace(/:/g, "")}`;
  const points = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const radius = index % 2 === 0 ? 96 : 84;
    return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
  }).join(" ");

  return (
    <span className="completion-seal" data-animate={animate || undefined} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" role="img" aria-label="MEC E Certified Explorer seal">
        <defs>
          <path id={pathId} d="M 40 100 A 60 60 0 0 1 160 100" />
        </defs>
        <path d="M70 150 L56 196 L78 184 L90 200 L100 156 Z M130 150 L144 196 L122 184 L110 200 L100 156 Z" fill="#275d38" />
        <polygon points={points} fill="#f2cd00" stroke="#c9a800" strokeWidth={2} />
        <circle cx={100} cy={100} r={72} fill="#275d38" />
        <circle cx={100} cy={100} r={64} fill="none" stroke="#f2cd00" strokeWidth={2} strokeDasharray="3 5" />
        <text fill="#f2cd00" fontSize={13} fontWeight={800} letterSpacing={2} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">CERTIFIED EXPLORER</textPath>
        </text>
        <path d="M100 82 L106 96 L121 97 L109 107 L113 122 L100 113 L87 122 L91 107 L79 97 L94 96 Z" fill="#f2cd00" />
        <text x={100} y={142} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight={800} letterSpacing={1.5} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">
          MEC E 2026
        </text>
      </svg>
    </span>
  );
}
