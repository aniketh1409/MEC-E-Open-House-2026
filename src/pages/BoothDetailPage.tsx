import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconBuilding, IconDoor, IconLayersIntersect } from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";
import { formatCategory, getActiveBoothById } from "../lib/content";

export function BoothDetailPage() {
  const { boothId = "" } = useParams();
  const booth = getActiveBoothById(boothId);

  if (!booth) {
    return (
      <Stack component="section" className="not-found" gap="sm" aria-labelledby="booth-not-found-heading">
        <Text className="eyebrow">Booth directory</Text>
        <Title order={1} id="booth-not-found-heading">Booth not found</Title>
        <Text c="dimmed" size="lg">
          This booth may be unavailable, or the link may be incorrect.
        </Text>
        <Button component={Link} to="/booths" variant="light" leftSection={<IconArrowLeft size={18} />} w="fit-content">
          Return to all booths
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="article" className="booth-detail" gap="md">
      <Button
        component={Link}
        to="/booths"
        variant="subtle"
        leftSection={<IconArrowLeft size={18} stroke={1.8} />}
        px={0}
        w="fit-content"
      >
        Back to booths
      </Button>
      <Badge variant="light" color="ualbertaGreen" w="fit-content">
        {formatCategory(booth.category)}
      </Badge>
      <Title order={1}>{booth.name}</Title>
      <Text className="booth-summary" c="dimmed" size="lg">
        {booth.shortDescription}
      </Text>

      <Paper component="section" className="visit-details" withBorder radius="md" p={{ base: "lg", sm: "xl" }} mt="md" aria-labelledby="visit-heading">
        <Text className="eyebrow">Location</Text>
        <Title order={2} size="h3" id="visit-heading" mt={4} mb="lg">Visit this booth</Title>
        <SimpleGrid component="dl" cols={{ base: 1, xs: 3 }} spacing="lg">
          <Group component="div" wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" color="ualbertaGreen" size="lg">
              <IconBuilding size={19} stroke={1.8} />
            </ThemeIcon>
            <Box>
              <Text component="dt" size="xs" c="dimmed" tt="uppercase" fw={700}>Building</Text>
              <Text component="dd" m={0} fw={700}>{booth.location.building}</Text>
            </Box>
          </Group>
          <Group component="div" wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" color="ualbertaGreen" size="lg">
              <IconLayersIntersect size={19} stroke={1.8} />
            </ThemeIcon>
            <Box>
              <Text component="dt" size="xs" c="dimmed" tt="uppercase" fw={700}>Floor</Text>
              <Text component="dd" m={0} fw={700}>{booth.location.floor}</Text>
            </Box>
          </Group>
          <Group component="div" wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" color="ualbertaGreen" size="lg">
              <IconDoor size={19} stroke={1.8} />
            </ThemeIcon>
            <Box>
              <Text component="dt" size="xs" c="dimmed" tt="uppercase" fw={700}>Room</Text>
              <Text component="dd" m={0} fw={700}>{booth.location.room}</Text>
            </Box>
          </Group>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
