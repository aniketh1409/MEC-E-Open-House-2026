import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconMapPin,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section aria-labelledby="home-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">DISCOVER WHAT&apos;S POSSIBLE</Text>

        <Title id="home-heading" order={1}>
          Mechanical Engineering Open House
        </Title>

        <Text c="dimmed" size="lg">
          Come explore Mechanical Engineering through interactive activities
          throughout the Mechanical Engineering Building. After check-in,
          follow a self-guided tour with fun stops along the way, meet current
          students and faculty, and experience our hands-on spaces, labs, and
          more.
        </Text>
      </Stack>

      <Group mt="lg" mb="xl">
        <Button
          component={Link}
          to="/booths"
          rightSection={<IconArrowRight size={17} stroke={1.8} />}
        >
          Explore booths
        </Button>
      </Group>

      <SimpleGrid
        component="ul"
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="lg"
      >
        <Card
          component="li"
          withBorder
          radius="md"
          padding="lg"
        >
          <IconCalendarEvent size={28} stroke={1.8} />

          <Title order={2} size="h3" mt="md">
            Plan Your Visit
          </Title>

          <Text c="dimmed" mt="xs">
            Check the event schedule and see what&apos;s happening throughout the day.
          </Text>

          <Button
            component={Link}
            to="/schedule"
            variant="subtle"
            rightSection={<IconArrowRight size={17} stroke={1.8} />}
            mt="md"
            px={0}
          >
            View Schedule
          </Button>
        </Card>

        <Card
          component="li"
          withBorder
          radius="md"
          padding="lg"
        >
          <IconSparkles size={28} stroke={1.8} />

          <Title order={2} size="h3" mt="md">
            Explore
          </Title>

          <Text c="dimmed" mt="xs">
            Discover demonstrations, research, student projects, and
            everything happening throughout the Open House.
          </Text>

          <Button
            component={Link}
            to="/booths"
            variant="subtle"
            rightSection={<IconArrowRight size={17} stroke={1.8} />}
            mt="md"
            px={0}
          >
            Explore booths
          </Button>
        </Card>

        <Card
          component="li"
          withBorder
          radius="md"
          padding="lg"
        >
          <IconMapPin size={28} stroke={1.8} />

          <Title order={2} size="h3" mt="md">
            Find Your Way
          </Title>

          <Text c="dimmed" mt="xs">
            Use the map to find booths, rooms, demonstrations, and other
            parts of the Open House.
          </Text>

          <Button
            component={Link}
            to="/map"
            variant="subtle"
            rightSection={<IconArrowRight size={17} stroke={1.8} />}
            mt="md"
            px={0}
          >
            View map
          </Button>
        </Card>

        <Card
          component="li"
          withBorder
          radius="md"
          padding="lg"
        >
          <IconSparkles size={28} stroke={1.8} />

          <Title order={2} size="h3" mt="md">
            Make Your Visit Count
          </Title>

          <Text c="dimmed" mt="xs">
            Visit different booths, learn about mechanical engineering,
            and collect stickers as you explore.
          </Text>

          <Button
            component={Link}
            to="/passport"
            variant="subtle"
            rightSection={<IconArrowRight size={17} stroke={1.8} />}
            mt="md"
            px={0}
          >
            Learn more
          </Button>
        </Card>
      </SimpleGrid>
    </section>
  );
}