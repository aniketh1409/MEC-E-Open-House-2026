import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconMapPin, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatCategory,
  getActiveBoothCategories,
  getActiveBooths,
} from "../lib/content";

const booths = getActiveBooths();
const categories = getActiveBoothCategories();

export function BoothDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filteredBooths = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return booths.filter((booth) => {
      const matchesName = booth.name.toLocaleLowerCase().includes(normalizedQuery);
      const matchesCategory = category === "all" || booth.category === category;
      return matchesName && matchesCategory;
    });
  }, [category, searchQuery]);

  return (
    <section aria-labelledby="booth-directory-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">Explore the event</Text>
        <Title id="booth-directory-heading" order={1}>
          Find your next stop
        </Title>
        <Text c="dimmed" size="lg">
          Browse demonstrations, research, and student groups participating in the open house.
        </Text>
      </Stack>

      <Paper className="directory-controls" withBorder radius="md" p="md" mt={32}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Search booths"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder="Search by name"
            leftSection={<IconSearch size={18} stroke={1.8} />}
          />
          <Select
            label="Category"
            value={category}
            onChange={(value) => setCategory(value ?? "all")}
            allowDeselect={false}
            data={[
              { value: "all", label: "All categories" },
              ...categories.map((value) => ({ value, label: formatCategory(value) })),
            ]}
          />
        </SimpleGrid>
      </Paper>

      <Group justify="space-between" mt="lg" mb="sm">
        <Text c="dimmed" size="sm" fw={600} aria-live="polite">
          {filteredBooths.length} {filteredBooths.length === 1 ? "booth" : "booths"}
        </Text>
      </Group>

      {filteredBooths.length > 0 ? (
        <SimpleGrid component="ul" cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" className="booth-grid">
          {filteredBooths.map((booth) => (
            <Card component="li" className="booth-card" key={booth.id} withBorder radius="md" padding="lg">
              <Badge variant="light" color="ualbertaGreen" size="sm" w="fit-content">
                {formatCategory(booth.category)}
              </Badge>
              <Title order={2} size="h3" mt="md">
                {booth.name}
              </Title>
              <Text c="dimmed" mt="xs" size="sm">
                {booth.shortDescription}
              </Text>
              <Group className="location-label" gap={7} wrap="nowrap">
                <IconMapPin size={18} stroke={1.8} aria-hidden="true" />
                <Text size="sm" fw={650}>
                  {booth.location.building} · Floor {booth.location.floor} · Room {booth.location.room}
                </Text>
              </Group>
              <Button
                component={Link}
                to={`/booths/${booth.id}`}
                aria-label={`View ${booth.name}`}
                variant="subtle"
                justify="space-between"
                rightSection={<IconArrowRight size={17} stroke={1.8} />}
                mt="md"
                px={0}
              >
                View booth
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Paper className="empty-state" withBorder radius="md" p="xl">
          <Title order={2} size="h3">No booths found</Title>
          <Text c="dimmed" mt={4}>Try another booth name or category.</Text>
        </Paper>
      )}
    </section>
  );
}
