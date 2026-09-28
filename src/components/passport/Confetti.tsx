import { useState, type CSSProperties } from "react";

const COLORS = ["#275d38", "#f2cd00", "#ffffff", "#3f8a55", "#ffe36b"];
const SHAPES = ["gear", "bolt", "square"] as const;

/** A one-off burst of gear, bolt and square confetti. Hidden when reduced motion is on. */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  // Random once per burst.
  const [confetti] = useState(() =>
    Array.from({ length: pieces }, (_, index) => ({
      shape: SHAPES[index % SHAPES.length]!,
      color: COLORS[index % COLORS.length]!,
      left: Math.round(Math.random() * 100),
      delay: Math.round(Math.random() * 500),
      duration: 1800 + Math.round(Math.random() * 1400),
      drift: Math.round((Math.random() - 0.5) * 160),
      spin: Math.round((Math.random() - 0.5) * 1080),
      size: 8 + Math.round(Math.random() * 8),
    })),
  );

  return (
    <div className="confetti" aria-hidden="true">
      {confetti.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          data-shape={piece.shape}
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size,
              color: piece.color,
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
              "--drift": `${piece.drift}px`,
              "--spin": `${piece.spin}deg`,
            } as CSSProperties
          }
        >
          {piece.shape === "gear" && (
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <circle cx={12} cy={12} r={7} fill="none" stroke="currentColor" strokeWidth={5} strokeDasharray="3.3 2.2" />
              <circle cx={12} cy={12} r={2.5} fill="currentColor" />
            </svg>
          )}
          {piece.shape === "bolt" && (
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" fill="currentColor" />
              <circle cx={12} cy={12} r={3.5} fill="rgb(0 0 0 / 25%)" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}
