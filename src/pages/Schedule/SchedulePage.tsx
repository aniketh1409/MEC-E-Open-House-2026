import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Chip,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCalendarPlus,
  IconConfetti,
  IconExternalLink,
  IconHourglass,
  IconMap2,
  IconMapPin,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { scheduleCategories } from "../../components/schedule/scheduleCategories";
import { useNow } from "../../hooks/useNow";
import {
  formatCountdown,
  formatEventDate,
  formatTime,
  getEventHours,
  getEventInfo,
  getEventPhase,
  getHappeningNow,
  getItemStatus,
  getLocationText,
  getScheduleItems,
  getScheduleMapLink,
  getUpNext,
  toIcs,
  type ScheduleItem,
} from "../../lib/schedule";
import type { ScheduleCategory } from "../../types/content";

const eventInfo = getEventInfo();
const { opensAt, closesAt } = getEventHours();
const items = getScheduleItems();
const categoriesInUse = (Object.keys(scheduleCategories) as ScheduleCategory[]).filter((category) =>
  items.some((item) => item.category === category),
);
const HAPPENING_NOW_LIMIT = 3;

function downloadCalendarFile(item: ScheduleItem) {
  const url = URL.createObjectURL(new Blob([toIcs(item)], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${item.id}.ics`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SchedulePage() {
  const now = useNow();
  const [category, setCategory] = useState<string>("all");
  const visibleItems = useMemo(
    () => (category === "all" ? items : items.filter((item) => item.category === category)),
    [category],
  );
  const phase = getEventPhase(now);

  return (
    <Stack component="section" gap="xl" aria-labelledby="schedule-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">Open House 2026</Text>
        <Title id="schedule-heading" order={1}>Schedule</Title>
        <Text c="dimmed" size="lg">
          {formatEventDate(opensAt)} · {formatTime(opensAt)} – {formatTime(closesAt)}
        </Text>
      </Stack>

      {eventInfo.isDraft && (
        <Alert color="ualbertaGold.5" variant="light" icon={<IconAlertTriangle size={20} />} title="Draft schedule">
          Times and rooms are still being confirmed and may change. Check back closer to the Open House.
        </Alert>
      )}

      {items.length === 0 ? (
        <Paper className="empty-state" withBorder radius="md" p="xl">
          <Title order={2} size="h3">The schedule is being finalized</Title>
          <Text c="dimmed" mt={4}>Event times will appear here once they are confirmed.</Text>
        </Paper>
      ) : (
        <>
          <NowCard now={now} />

          <Stack gap="md">
            <Chip.Group value={category} onChange={(value) => setCategory(value as string)}>
              <Group className="schedule-filters" gap="xs" role="group" aria-label="Filter events">
                <Chip value="all" color="ualbertaGreen" variant="outline">All</Chip>
                {categoriesInUse.map((value) => (
                  <Chip key={value} value={value} color="ualbertaGreen" variant="outline">
                    {scheduleCategories[value].label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>

            <Timeline items={visibleItems} now={now} showNowMarker={phase === "during"} />
          </Stack>
        </>
      )}

      {eventInfo.programsCalendarUrl && (
        <Paper className="schedule-card" withBorder radius="md" p="lg">
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Group wrap="nowrap" gap="md">
              <ThemeIcon variant="light" color="ualbertaGreen" size="xl" radius="md">
                <IconCalendarEvent size={22} />
              </ThemeIcon>
              <div>
                <Title order={2} size="h4">MEC E programs calendar</Title>
                <Text size="sm" c="dimmed">Upcoming Mechanical Engineering program dates and events.</Text>
              </div>
            </Group>
            <Button
              component="a"
              href={eventInfo.programsCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              rightSection={<IconExternalLink size={16} />}
            >
              Open
            </Button>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

function NowCard({ now }: { now: Date }) {
  const phase = getEventPhase(now);

  if (phase === "before") {
    return (
      <Paper className="schedule-now-card" data-phase="before" radius="md" p="lg">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon color="ualbertaGold.5" c="ualbertaGreen.9" size="lg" radius="xl">
            <IconHourglass size={20} />
          </ThemeIcon>
          <div>
            <Text className="schedule-now-label">Coming up</Text>
            <Title order={2} size="h3">Open House starts in {formatCountdown(opensAt.getTime() - now.getTime())}</Title>
            <Text size="sm" mt={4}>
              Doors open {formatEventDate(opensAt)} at {formatTime(opensAt)}. Plan your day below.
            </Text>
          </div>
        </Group>
      </Paper>
    );
  }

  if (phase === "after") {
    return (
      <Paper className="schedule-now-card" data-phase="after" radius="md" p="lg">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon color="ualbertaGold.5" c="ualbertaGreen.9" size="lg" radius="xl">
            <IconConfetti size={20} />
          </ThemeIcon>
          <div>
            <Text className="schedule-now-label">That's a wrap</Text>
            <Title order={2} size="h3">Thanks for visiting Mechanical Engineering!</Title>
            <Anchor component={Link} to="/passport" size="sm" mt={4} display="inline-block">
              See the stamps you collected
            </Anchor>
          </div>
        </Group>
      </Paper>
    );
  }

  const happeningNow = getHappeningNow(items, now);
  const upNext = getUpNext(items, now);
  const hiddenCount = happeningNow.length - HAPPENING_NOW_LIMIT;

  return (
    <Paper className="schedule-now-card" data-phase="during" radius="md" p="lg" aria-live="polite">
      <Text className="schedule-now-label">
        <span className="schedule-live-dot" aria-hidden="true" /> Happening now
      </Text>
      {happeningNow.length === 0 ? (
        <Text mt="xs">Nothing is scheduled right this minute. Explore the booths and tour stops.</Text>
      ) : (
        <Stack gap="xs" mt="xs">
          {happeningNow.slice(0, HAPPENING_NOW_LIMIT).map((item) => (
            <NowRow key={item.id} item={item} detail={`until ${formatTime(item.endsAt)}`} />
          ))}
          {hiddenCount > 0 && <Text size="sm">+ {hiddenCount} more in the schedule below</Text>}
        </Stack>
      )}
      {upNext.length > 0 && (
        <Box className="schedule-up-next" mt="md" pt="md">
          <Text className="schedule-now-label">Up next · {formatTime(upNext[0]!.startsAt)}</Text>
          <Stack gap="xs" mt="xs">
            {upNext.map((item) => (
              <NowRow key={item.id} item={item} detail={`in ${formatCountdown(item.startsAt.getTime() - now.getTime())}`} />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

function NowRow({ item, detail }: { item: ScheduleItem; detail: string }) {
  const location = getLocationText(item);
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap" className="schedule-now-row">
      <div>
        <Text fw={750}>{item.title}</Text>
        <Text size="sm" className="schedule-now-detail">
          {[location, detail].filter(Boolean).join(" · ")}
        </Text>
      </div>
      <MapButton item={item} compact />
    </Group>
  );
}

function Timeline({ items: timelineItems, now, showNowMarker }: { items: ScheduleItem[]; now: Date; showNowMarker: boolean }) {
  const groups = useMemo(() => {
    const byStart = new Map<number, ScheduleItem[]>();
    for (const item of timelineItems) {
      const key = item.startsAt.getTime();
      byStart.set(key, [...(byStart.get(key) ?? []), item]);
    }
    return [...byStart.entries()].map(([start, groupItems]) => ({ start: new Date(start), items: groupItems }));
  }, [timelineItems]);

  if (timelineItems.length === 0) {
    return <Text c="dimmed">No events in this category.</Text>;
  }

  const nowMarkerIndex = showNowMarker ? groups.findIndex((group) => group.start > now) : -1;

  return (
    <Stack component="ol" gap={0} className="schedule-timeline" aria-label="Event timeline">
      {groups.map((group, index) => (
        <Box component="li" key={group.start.getTime()} className="schedule-slot">
          {index === nowMarkerIndex && (
            <div className="schedule-now-marker" aria-label={`Current time ${formatTime(now)}`}>
              <span>Now · {formatTime(now)}</span>
            </div>
          )}
          <div className="schedule-slot-row">
            <Text className="schedule-slot-time" component="time" dateTime={group.start.toISOString()}>
              {formatTime(group.start)}
            </Text>
            <Stack gap="sm" className="schedule-slot-events">
              {group.items.map((item) => (
                <EventCard key={item.id} item={item} now={now} />
              ))}
            </Stack>
          </div>
        </Box>
      ))}
    </Stack>
  );
}

function EventCard({ item, now }: { item: ScheduleItem; now: Date }) {
  const status = getItemStatus(item, now);
  const category = scheduleCategories[item.category];
  const CategoryIcon = category.icon;
  const location = getLocationText(item);

  return (
    <Paper className="schedule-card schedule-event" data-status={status} withBorder radius="md" p="md">
      <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
        <Text size="sm" fw={700} c="dimmed">
          {formatTime(item.startsAt)} – {formatTime(item.endsAt)}
        </Text>
        {status === "live" && <Badge color="red" variant="filled" size="sm">Now</Badge>}
        {status === "past" && <Badge color="gray" variant="light" size="sm">Ended</Badge>}
      </Group>
      <Title order={3} size="h4" mt={4}>{item.title}</Title>

      <Group gap={6} mt="xs">
        <Badge color={category.color} variant="light" size="sm" leftSection={<CategoryIcon size={12} />}>
          {category.label}
        </Badge>
        {item.scope === "university" && <Badge color="gray" variant="outline" size="sm">University-wide</Badge>}
        {item.isConfirmed === false && <Badge color="ualbertaGold.5" c="ualbertaGreen.9" variant="filled" size="sm">Time TBC</Badge>}
      </Group>

      {location && (
        <Group gap={6} mt="sm" wrap="nowrap" className="schedule-location">
          <IconMapPin size={16} stroke={1.8} aria-hidden="true" />
          <Text size="sm" fw={650}>{location}</Text>
        </Group>
      )}
      {item.description && <Text size="sm" c="dimmed" mt={6}>{item.description}</Text>}

      {status !== "past" && (
        <Group gap="xs" mt="md">
          <MapButton item={item} />
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconCalendarPlus size={16} />}
            onClick={() => downloadCalendarFile(item)}
            aria-label={`Add ${item.title} at ${formatTime(item.startsAt)} to your calendar`}
          >
            Add to calendar
          </Button>
        </Group>
      )}
    </Paper>
  );
}

function MapButton({ item, compact = false }: { item: ScheduleItem; compact?: boolean }) {
  const link = getScheduleMapLink(item);
  if (!link) {
    return null;
  }

  const common = {
    size: "xs" as const,
    variant: compact ? ("white" as const) : ("light" as const),
    leftSection: <IconMap2 size={16} />,
    className: "schedule-map-button",
    "aria-label": `Show ${item.title} on the map`,
  };
  return link.kind === "internal" ? (
    <Button component={Link} to={link.to} {...common}>
      {compact ? "Map" : "Show on map"}
    </Button>
  ) : (
    <Button component="a" href={link.href} target="_blank" rel="noopener noreferrer" {...common}>
      {compact ? "Map" : "Show on map"}
    </Button>
  );
}
