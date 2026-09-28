import { Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useNow } from "../../hooks/useNow";
import { formatEventDate, formatTime, getEventHours, getEventPhase } from "../../lib/schedule";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getCountdownParts(milliseconds: number) {
  const remaining = Math.max(0, milliseconds);
  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
  };
}

function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/** A mechanical-counter countdown to opening time; switches to "open now" and "thanks" on and after the day. */
export function EventCountdown() {
  const now = useNow();
  const { opensAt, closesAt } = getEventHours();
  const phase = getEventPhase(now);
  const when = (
    <>
      {formatEventDate(opensAt)} · <span className="event-countdown-hours">{formatTime(opensAt)} – {formatTime(closesAt)}</span>
    </>
  );

  if (phase === "during") {
    return (
      <div className="event-countdown" data-phase="during">
        <p className="event-countdown-status">
          <span className="event-countdown-live-dot" aria-hidden="true" />
          Doors are open until {formatTime(closesAt)}
        </p>
        <Text className="event-countdown-when">Come on in: everything is running today.</Text>
      </div>
    );
  }

  if (phase === "after") {
    return (
      <div className="event-countdown" data-phase="after">
        <p className="event-countdown-status">Thanks for coming to Open House 2026!</p>
        <Text className="event-countdown-when">We hope to see you again next year.</Text>
      </div>
    );
  }

  const { days, hours, minutes } = getCountdownParts(opensAt.getTime() - now.getTime());
  const label = `${plural(days, "day")}, ${plural(hours, "hour")} and ${plural(minutes, "minute")} until the Open House`;

  return (
    <div className="event-countdown" data-phase="before">
      <div className="event-countdown-counter" role="timer" aria-label={label}>
        <span className="event-countdown-gears" aria-hidden="true">
          <IconSettings className="event-countdown-gear" size={26} stroke={1.6} />
          <IconSettings className="event-countdown-gear event-countdown-gear-small" size={16} stroke={1.8} />
        </span>
        <CounterUnit value={days} unit={days === 1 ? "day" : "days"} />
        <CounterUnit value={hours} unit="hrs" />
        <CounterUnit value={minutes} unit="min" />
      </div>
      <Text className="event-countdown-when">{when}</Text>
    </div>
  );
}

function CounterUnit({ value, unit }: { value: number; unit: string }) {
  const digits = String(value).padStart(2, "0").split("").map(Number);
  return (
    <span className="event-countdown-unit" aria-hidden="true">
      <span className="event-countdown-wheels">
        {digits.map((digit, index) => (
          <OdometerWheel key={digits.length - index} digit={digit} />
        ))}
      </span>
      <span className="event-countdown-unit-label">{unit}</span>
    </span>
  );
}

/** One odometer wheel: a strip of 0–9 that rolls to the current digit. */
function OdometerWheel({ digit }: { digit: number }) {
  return (
    <span className="event-countdown-wheel" data-digit={digit}>
      <span className="event-countdown-strip" style={{ transform: `translateY(${-digit * 10}%)` }}>
        {Array.from({ length: 10 }, (_, value) => (
          <span key={value}>{value}</span>
        ))}
      </span>
    </span>
  );
}
