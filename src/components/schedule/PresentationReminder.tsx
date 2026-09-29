import { ActionIcon, Button, Text } from "@mantine/core";
import { IconMap2, IconPresentation, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useNow } from "../../hooks/useNow";
import { formatCountdown, formatTime, getScheduleItems, getScheduleMapLink } from "../../lib/schedule";

/** Start showing the reminder this long before a presentation begins. */
const SHOW_BEFORE_MS = 2 * 60 * 60_000;
const DISMISS_KEY = "mece-open-house-dismissed-reminders";

const presentations = getScheduleItems().filter((item) => item.category === "presentation");

function loadDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * A small card counting down to the next program presentation on the day
 * ("starts in 25 minutes"), then "on now" while it runs. Hidden otherwise.
 */
export function PresentationReminder({ className }: { className?: string }) {
  const now = useNow();
  const [dismissed, setDismissed] = useState(loadDismissed);

  const presentation = presentations.find(
    (item) => now < item.endsAt && now.getTime() >= item.startsAt.getTime() - SHOW_BEFORE_MS,
  );
  if (!presentation || dismissed.includes(presentation.id)) {
    return null;
  }

  const isOn = now >= presentation.startsAt;
  const where = [presentation.locationLabel, presentation.building?.abbreviation].filter(Boolean).join(" · ");
  const mapLink = getScheduleMapLink(presentation);

  const dismiss = () => {
    const next = [...dismissed, presentation.id];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: stays dismissed until the page reloads.
    }
  };

  return (
    <aside className={["presentation-reminder", className].filter(Boolean).join(" ")} data-live={isOn || undefined} aria-live="polite">
      <span className="presentation-reminder-icon" aria-hidden="true">
        <IconPresentation size={22} stroke={1.8} />
      </span>
      <div className="presentation-reminder-text">
        <Text fw={800} lh={1.25}>
          {isOn
            ? `Program presentation is on now · until ${formatTime(presentation.endsAt)}`
            : `Program presentation starts in ${formatCountdown(presentation.startsAt.getTime() - now.getTime())}`}
        </Text>
        <Text size="sm" c="dimmed">
          {formatTime(presentation.startsAt)} · {where}
        </Text>
      </div>
      {mapLink?.kind === "internal" && (
        <Button component={Link} to={mapLink.to} size="compact-sm" variant="light" leftSection={<IconMap2 size={15} />}>
          Directions
        </Button>
      )}
      <ActionIcon variant="subtle" color="gray" aria-label="Dismiss reminder" onClick={dismiss}>
        <IconX size={16} />
      </ActionIcon>
    </aside>
  );
}
