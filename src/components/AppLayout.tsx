import { AppShell, Box, Container, Group, Text } from "@mantine/core";
import {
  IconCalendarEvent,
  IconHome,
  IconMap2,
  IconMapPin,
  IconSettings,
  IconTicket,
  type Icon,
} from "@tabler/icons-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

interface NavigationItem {
  label: string;
  path: string;
  icon: Icon;
}

const navigation: NavigationItem[] = [
  { label: "Home", path: "/", icon: IconHome },
  { label: "Schedule", path: "/schedule", icon: IconCalendarEvent },
  { label: "Booths", path: "/booths", icon: IconMapPin },
  { label: "Map", path: "/map", icon: IconMap2 },
  { label: "Passport", path: "/passport", icon: IconTicket },
];

export function AppLayout() {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <AppShell header={{ height: 76 }} padding={0}>
      <AppShell.Header className="site-header">
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Link to="/" className="brand-link" aria-label="Open House home">
              <Box className="brand-mark">
                <IconSettings size={25} stroke={1.9} aria-hidden="true" />
              </Box>
              <Box>
                <Text className="brand-department">Mechanical Engineering</Text>
                <Text className="brand-event">Open House 2026</Text>
              </Box>
            </Link>

            <Group component="nav" aria-label="Primary navigation" gap={4} visibleFrom="sm">
              {navigation.map(({ label, path, icon: NavigationIcon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className="desktop-nav-link"
                  data-active={isActive(path) || undefined}
                >
                  <NavigationIcon size={17} stroke={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container component="main" size="lg" py={{ base: 28, sm: 44 }}>
          <Outlet />
        </Container>
      </AppShell.Main>

      <Box component="nav" aria-label="Primary navigation" className="mobile-nav" hiddenFrom="sm">
        {navigation.map(({ label, path, icon: NavigationIcon }) => (
          <NavLink
            key={path}
            to={path}
            className="mobile-nav-link"
            data-active={isActive(path) || undefined}
          >
            <NavigationIcon size={21} stroke={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </Box>
    </AppShell>
  );
}
