import { Stack, Tabs, Text, Title, VisuallyHidden } from "@mantine/core";
import { IconBuildingSkyscraper, IconMapPins } from "@tabler/icons-react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { usePassport } from "../../hooks/usePassport";
import { CAMPUS_MAP_PATH, getTourStops, TOUR_MAP_PATH } from "../../lib/map";

const tabs = [
  { value: CAMPUS_MAP_PATH, label: "Getting here", icon: IconMapPins },
  { value: TOUR_MAP_PATH, label: "MEC E tour", icon: IconBuildingSkyscraper },
];

const tourStampIds = new Set(getTourStops().map((stop) => stop.booth.stamp.id));

/** `/map` opens the tour for visitors who are already inside MEC E, and campus directions otherwise. */
export function MapIndexRedirect() {
  const { state } = usePassport();
  const isInsideTour = state.collectedStamps.some((stampId) => tourStampIds.has(stampId));
  return <Navigate to={isInsideTour ? TOUR_MAP_PATH : CAMPUS_MAP_PATH} replace />;
}

export function MapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const activeTab = location.pathname.startsWith(TOUR_MAP_PATH) ? TOUR_MAP_PATH : CAMPUS_MAP_PATH;

  const tabList = (
    <Tabs
      value={activeTab}
      onChange={(value) => value && navigate(value)}
      color="ualbertaGreen"
      className={isMobile ? "map-screen-tabs" : undefined}
    >
      <Tabs.List grow={isMobile}>
        {tabs.map(({ value, label, icon: TabIcon }) => (
          <Tabs.Tab key={value} value={value} leftSection={<TabIcon size={17} stroke={1.8} />}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );

  if (isMobile) {
    return (
      <section className="map-screen" aria-labelledby="map-heading">
        <VisuallyHidden>
          <h1 id="map-heading">Event map</h1>
        </VisuallyHidden>
        {tabList}
        <div className="map-screen-body">
          <Outlet />
        </div>
      </section>
    );
  }

  return (
    <Stack component="section" gap="lg" aria-labelledby="map-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">Find your way</Text>
        <Title id="map-heading" order={1}>Event map</Title>
        <Text c="dimmed" size="lg">
          Walk from the Butterdome to the MEC E building, then follow the tour stops inside.
        </Text>
      </Stack>
      {tabList}
      <Outlet />
    </Stack>
  );
}
