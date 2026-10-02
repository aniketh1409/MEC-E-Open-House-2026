import { Button, SimpleGrid, Text, Title } from "@mantine/core";
import { IconHome, IconMap2, IconMapPin, IconTicket } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

/** A gear outline: a thick dashed ring makes the teeth. */
function Gear({ cx, cy, r, teeth, color, className }: { cx: number; cy: number; r: number; teeth: number; color: string; className: string }) {
  const toothRing = 2 * Math.PI * (r + 6);
  return (
    <g className={className} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth={14} strokeDasharray={`${toothRing / teeth / 2} ${toothRing / teeth / 2}`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={12} />
      <circle cx={cx} cy={cy} r={r * 0.32} fill={color} />
    </g>
  );
}

const links = [
  { to: "/", label: "Home", icon: IconHome },
  { to: "/map", label: "Map", icon: IconMap2 },
  { to: "/booths", label: "Stalls", icon: IconMapPin },
  { to: "/passport", label: "Passport", icon: IconTicket },
];

/** Shown for any address that isn't a page: "404" with the zeros as meshing gears. */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const [fixing, setFixing] = useState(false);

  return (
    <section className="not-found-page" aria-labelledby="not-found-heading">
      <button
        type="button"
        className="not-found-art"
        data-fixing={fixing || undefined}
        aria-label={fixing ? "Gears spinning" : "Spin the gears"}
        onClick={() => setFixing(true)}
      >
        <svg viewBox="0 0 520 220" aria-hidden="true">
          <text x={70} y={160} className="not-found-four">4</text>
          <Gear cx={210} cy={112} r={52} teeth={12} color="#275d38" className="not-found-gear not-found-gear-left" />
          <Gear cx={326} cy={112} r={52} teeth={12} color="#f2cd00" className="not-found-gear not-found-gear-right" />
          <text x={450} y={160} className="not-found-four">4</text>
        </svg>
      </button>
      {fixing && <Text className="not-found-fixing" aria-live="polite">Fixing it…</Text>}

      <svg className="not-found-route" viewBox="0 0 320 60" aria-hidden="true">
        <path d="M8 44 C 70 44, 80 14, 140 18 S 220 52, 268 30" />
        <circle cx={290} cy={22} r={13} />
        <text x={290} y={27}>?</text>
      </svg>

      <Text className="eyebrow">Page not found</Text>
      <Title id="not-found-heading" order={1} mt={4}>This room isn&apos;t on the floor plan.</Title>
      <Text c="dimmed" size="lg" mt="xs" maw={520}>
        Looks like you took a wrong turn between floors. Let&apos;s get you back on the tour.
      </Text>
      <Text className="not-found-path" mt="sm">{pathname}</Text>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="xl" className="not-found-links">
        {links.map(({ to, label, icon: LinkIcon }) => (
          <Button key={to} component={Link} to={to} variant={to === "/" ? "filled" : "light"} leftSection={<LinkIcon size={18} />}>
            {label}
          </Button>
        ))}
      </SimpleGrid>
    </section>
  );
}
