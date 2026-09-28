import type { ReactNode } from "react";

/**
 * Placeholder sticker artwork, drawn on a 200 × 200 canvas: the illustration sits in the
 * circle centred on (100, 88), radius ~50, above the curved name. To swap in real artwork
 * later, replace an entry's `art` (or render an <image> instead).
 */
export interface StickerDesign {
  /** Disc colour. */
  background: string;
  /** Main line/fill colour for the art and the curved name. */
  ink: string;
  /** Second accent colour. */
  accent: string;
  /** Student-group stickers get a holographic shine. */
  holo?: boolean;
  art: ReactNode;
}

const GREEN = "#275d38";
const DEEP = "#173622";
const GOLD = "#f2cd00";
const WHITE = "#ffffff";
const NAVY = "#1d2f4f";

/** A gear outline: a thick dashed ring makes the teeth, a plain ring the body. */
function gear(cx: number, cy: number, r: number, color: string, teeth = 10) {
  const circumference = 2 * Math.PI * (r + 4);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth={9} strokeDasharray={`${circumference / teeth / 2} ${circumference / teeth / 2}`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6} />
    </g>
  );
}

const line = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const stickerDesigns: Record<string, StickerDesign> = {
  // Butterdome with a starting flag.
  "stamp-open-house-booth": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    art: (
      <g>
        <path d="M50 116 Q100 44 150 116 Z" fill={GREEN} />
        <path d="M75 116 Q100 74 125 116 M100 116 V70" {...line} stroke={GOLD} strokeWidth={4} opacity={0.7} />
        <path d="M40 118 H160" {...line} stroke={DEEP} strokeWidth={6} />
        <path d="M100 66 V36" {...line} stroke={DEEP} strokeWidth={4} />
        <path d="M101 36 L124 43 L101 51 Z" fill={WHITE} stroke={DEEP} strokeWidth={3} strokeLinejoin="round" />
      </g>
    ),
  },
  // Presentation screen with a rising chart.
  "stamp-program-presentation": {
    background: GREEN,
    ink: WHITE,
    accent: GOLD,
    art: (
      <g>
        <rect x={52} y={44} width={96} height={62} rx={6} fill={WHITE} />
        <path d="M64 94 L84 78 L100 86 L126 60" {...line} stroke={GREEN} strokeWidth={6} />
        <circle cx={126} cy={60} r={5} fill={GOLD} stroke={GREEN} strokeWidth={3} />
        <path d="M100 106 V122 M82 124 H118" {...line} stroke={GOLD} strokeWidth={6} />
      </g>
    ),
  },
  // Open door with a dotted trail leading out.
  "stamp-west-entry": {
    background: GREEN,
    ink: WHITE,
    accent: GOLD,
    art: (
      <g>
        <rect x={92} y={42} width={40} height={70} rx={3} fill={DEEP} stroke={GOLD} strokeWidth={5} />
        <path d="M92 42 L72 52 V122 L92 112 Z" fill={GOLD} />
        <circle cx={78} cy={88} r={3} fill={DEEP} />
        <path d="M112 118 Q128 128 150 118" {...line} stroke={WHITE} strokeWidth={5} strokeDasharray="1 11" />
      </g>
    ),
  },
  // Drafting compass over a blueprint grid.
  "stamp-design-courses": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    art: (
      <g>
        <path d="M58 58 H142 M58 82 H142 M58 106 H142 M72 44 V122 M100 44 V122 M128 44 V122" {...line} stroke={GREEN} strokeWidth={2} opacity={0.3} />
        <path d="M76 120 A30 30 0 0 0 124 120" {...line} stroke={GREEN} strokeWidth={4} strokeDasharray="6 7" />
        <path d="M100 52 L76 120 M100 52 L124 120" {...line} stroke={DEEP} strokeWidth={7} />
        <circle cx={100} cy={48} r={8} fill={GREEN} stroke={DEEP} strokeWidth={4} />
      </g>
    ),
  },
  // Little autonomous submarine with bubbles.
  "stamp-arvp": {
    background: NAVY,
    ink: WHITE,
    accent: GOLD,
    holo: true,
    art: (
      <g>
        <rect x={88} y={62} width={20} height={18} rx={4} fill={GOLD} />
        <ellipse cx={100} cy={92} rx={42} ry={20} fill={GOLD} />
        <circle cx={86} cy={92} r={6} fill={NAVY} />
        <circle cx={104} cy={92} r={6} fill={NAVY} />
        <path d="M142 92 L154 82 V102 Z" fill={WHITE} />
        <circle cx={68} cy={62} r={5} {...line} stroke={WHITE} strokeWidth={3} />
        <circle cx={58} cy={48} r={3.5} {...line} stroke={WHITE} strokeWidth={3} />
        <path d="M60 118 Q72 112 84 118 T108 118 T132 118" {...line} stroke={WHITE} strokeWidth={3} opacity={0.6} />
      </g>
    ),
  },
  // Teardrop eco-car and a hydrogen droplet.
  "stamp-ecocar": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    holo: true,
    art: (
      <g>
        <path d="M50 104 Q60 72 104 70 Q140 70 152 104 Z" fill={GREEN} />
        <path d="M84 76 Q104 70 122 80 L118 92 H88 Z" fill={WHITE} opacity={0.85} />
        <circle cx={74} cy={106} r={10} fill={DEEP} stroke={GOLD} strokeWidth={4} />
        <circle cx={130} cy={106} r={10} fill={DEEP} stroke={GOLD} strokeWidth={4} />
        <path d="M100 30 Q112 46 112 54 A12 12 0 0 1 88 54 Q88 46 100 30 Z" fill={WHITE} stroke={GREEN} strokeWidth={3} />
        <text x={100} y={58} textAnchor="middle" fontSize={10} fontWeight={800} fill={GREEN}>H₂</text>
      </g>
    ),
  },
  // Checkered flag and speed lines.
  "stamp-formula-racing": {
    background: GREEN,
    ink: WHITE,
    accent: GOLD,
    holo: true,
    art: (
      <g>
        <path d="M70 124 V40" {...line} stroke={GOLD} strokeWidth={6} />
        <path d="M72 42 Q100 34 128 44 Q144 50 150 46 V86 Q144 90 128 84 Q100 74 72 82 Z" fill={WHITE} />
        <g fill={DEEP}>
          <rect x={72} y={42} width={13} height={13} />
          <rect x={98} y={40} width={13} height={13} />
          <rect x={124} y={44} width={13} height={13} />
          <rect x={85} y={55} width={13} height={13} />
          <rect x={111} y={54} width={13} height={13} />
          <rect x={137} y={57} width={13} height={13} />
          <rect x={72} y={68} width={13} height={13} />
          <rect x={98} y={67} width={13} height={13} />
          <rect x={124} y={71} width={13} height={13} />
        </g>
        <path d="M92 104 H146 M104 116 H152" {...line} stroke={GOLD} strokeWidth={5} />
      </g>
    ),
  },
  // Flask and pressure gauge.
  "stamp-mece-403-lab": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    art: (
      <g>
        <path d="M70 40 H94 M76 40 V70 L54 116 Q52 122 58 122 H106 Q112 122 110 116 L88 70 V40" {...line} stroke={DEEP} strokeWidth={6} />
        <path d="M64 100 H100 L108 118 H58 Z" fill={GREEN} />
        <circle cx={74} cy={108} r={3} fill={WHITE} />
        <circle cx={86} cy={100} r={2.5} fill={WHITE} />
        <path d="M118 96 A22 22 0 0 1 158 96" {...line} stroke={DEEP} strokeWidth={6} />
        <path d="M138 96 L150 80" {...line} stroke={GREEN} strokeWidth={5} />
        <circle cx={138} cy={96} r={5} fill={DEEP} />
      </g>
    ),
  },
  // Trophy with a bright idea.
  "stamp-dra-capstone": {
    background: GREEN,
    ink: WHITE,
    accent: GOLD,
    art: (
      <g>
        <path d="M74 50 H126 V70 A26 26 0 0 1 74 70 Z" fill={GOLD} />
        <path d="M74 56 H62 Q60 76 78 80 M126 56 H138 Q140 76 122 80" {...line} stroke={GOLD} strokeWidth={5} />
        <path d="M100 96 V110 M84 116 H116" {...line} stroke={GOLD} strokeWidth={7} />
        <circle cx={100} cy={66} r={8} fill={WHITE} />
        <path d="M100 30 V38 M78 36 L83 42 M122 36 L117 42" {...line} stroke={WHITE} strokeWidth={4} />
      </g>
    ),
  },
  // CubeSat orbiting a small Earth.
  "stamp-albertasat": {
    background: NAVY,
    ink: WHITE,
    accent: GOLD,
    holo: true,
    art: (
      <g>
        <circle cx={92} cy={96} r={24} fill={GREEN} />
        <path d="M76 88 Q84 82 90 90 T104 92 M84 108 Q92 102 100 110" {...line} stroke={GOLD} strokeWidth={3} opacity={0.8} />
        <ellipse cx={100} cy={88} rx={58} ry={20} {...line} stroke={WHITE} strokeWidth={3} strokeDasharray="5 6" transform="rotate(-18 100 88)" />
        <g transform="translate(138 58) rotate(-18)">
          <rect x={-8} y={-8} width={16} height={16} rx={2} fill={GOLD} stroke={WHITE} strokeWidth={2} />
          <rect x={-26} y={-5} width={14} height={10} fill={WHITE} />
          <rect x={12} y={-5} width={14} height={10} fill={WHITE} />
        </g>
        <circle cx={52} cy={48} r={2.5} fill={WHITE} />
        <circle cx={150} cy={116} r={2} fill={WHITE} />
      </g>
    ),
  },
  // Rocket with a pixel exhaust (a nod to STARR's logo).
  "stamp-starr": {
    background: DEEP,
    ink: WHITE,
    accent: GOLD,
    holo: true,
    art: (
      <g>
        <path d="M100 30 Q118 50 116 88 H84 Q82 50 100 30 Z" fill={WHITE} />
        <circle cx={100} cy={62} r={7} fill={GOLD} stroke={DEEP} strokeWidth={3} />
        <path d="M84 76 L70 96 H84 Z M116 76 L130 96 H116 Z" fill={GOLD} />
        <g>
          <rect x={86} y={90} width={9} height={9} fill={GOLD} />
          <rect x={95.5} y={90} width={9} height={9} fill="#ffe36b" />
          <rect x={105} y={90} width={9} height={9} fill={GOLD} />
          <rect x={90} y={100} width={9} height={9} fill="#7fbf94" />
          <rect x={100} y={100} width={9} height={9} fill={GOLD} />
          <rect x={95} y={110} width={9} height={9} fill="#7fbf94" opacity={0.7} />
          <rect x={95} y={120} width={9} height={7} fill="#7fbf94" opacity={0.4} />
        </g>
      </g>
    ),
  },
  // Leaf inside a gear.
  "stamp-esw": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    holo: true,
    art: (
      <g>
        {gear(100, 86, 34, GREEN, 12)}
        <path d="M84 102 Q80 72 116 66 Q120 98 90 102 Z" fill={GREEN} />
        <path d="M86 102 Q96 88 110 74" {...line} stroke={GOLD} strokeWidth={3} />
      </g>
    ),
  },
  // Friendly moose in a gear (a nod to the club mascot).
  "stamp-mece-club": {
    background: GREEN,
    ink: WHITE,
    accent: GOLD,
    holo: true,
    art: (
      <g>
        {gear(100, 88, 40, GOLD, 12)}
        <path d="M86 70 Q100 62 114 70 L118 100 Q116 118 100 120 Q84 118 82 100 Z" fill="#8a5a3b" />
        <path d="M84 72 Q66 66 62 50 M72 64 Q66 56 68 48 M116 72 Q134 66 138 50 M128 64 Q134 56 132 48" {...line} stroke="#c49a6c" strokeWidth={6} />
        <circle cx={93} cy={84} r={3} fill={WHITE} />
        <circle cx={107} cy={84} r={3} fill={WHITE} />
        <path d="M93 108 Q100 112 107 108" {...line} stroke={WHITE} strokeWidth={3} />
      </g>
    ),
  },
  // Spinning flywheel.
  "stamp-mece-301-lab": {
    background: GOLD,
    ink: DEEP,
    accent: GREEN,
    art: (
      <g>
        <circle cx={100} cy={86} r={34} fill="none" stroke={GREEN} strokeWidth={10} />
        <path d="M100 52 V120 M66 86 H134 M76 62 L124 110 M124 62 L76 110" {...line} stroke={GREEN} strokeWidth={4} />
        <circle cx={100} cy={86} r={9} fill={DEEP} />
        <path d="M58 60 A50 50 0 0 1 84 38 M142 112 A50 50 0 0 1 116 134" {...line} stroke={DEEP} strokeWidth={4} />
      </g>
    ),
  },
};

export const fallbackDesign: StickerDesign = {
  background: GREEN,
  ink: WHITE,
  accent: GOLD,
  art: gear(100, 86, 30, GOLD),
};
