import { Stack, Tabs, Text, Title } from "@mantine/core";
import { IconBuildingSkyscraper, IconMapPins } from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { value: "/map", label: "Getting here", icon: IconMapPins },
  { value: "/map/tour", label: "MEC E tour", icon: IconBuildingSkyscraper },
];

export function MapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.startsWith("/map/tour") ? "/map/tour" : "/map";

  return (
    <Stack component="section" gap="lg" aria-labelledby="map-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">Find your way</Text>
        <Title id="map-heading" order={1}>Event map</Title>
        <Text c="dimmed" size="lg">
          Walk from the Butterdome to the MEC E building, then follow the tour stops inside.
        </Text>
      </Stack>

      <Tabs value={activeTab} onChange={(value) => value && navigate(value)} color="ualbertaGreen">
        <Tabs.List>
          {tabs.map(({ value, label, icon: TabIcon }) => (
            <Tabs.Tab key={value} value={value} leftSection={<TabIcon size={17} stroke={1.8} />}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Stack>
  );
}
