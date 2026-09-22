import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCheck,
  IconLock,
  IconQrcode,
  IconRefresh,
  IconRosetteDiscountCheck,
} from "@tabler/icons-react";
import { getActiveBooths } from "../lib/content";
import { usePassport } from "../hooks/usePassport";

const booths = getActiveBooths();

export function PassportPage() {
  const { state, isPersistent, resetPassport } = usePassport();
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false);
  const collectedStampIds = new Set(state.collectedStamps);
  const collectedCount = booths.filter((booth) => collectedStampIds.has(booth.stamp.id)).length;
  const isComplete = booths.length > 0 && collectedCount === booths.length;
  const progress = booths.length === 0 ? 0 : (collectedCount / booths.length) * 100;

  const handleReset = () => {
    resetPassport();
    closeReset();
  };

  return (
    <Stack component="section" gap="xl" aria-labelledby="passport-heading">
      <Stack gap={6} maw={720}>
        <Text className="eyebrow">Your open house journey</Text>
        <Title id="passport-heading" order={1}>Passport</Title>
        <Text c="dimmed" size="lg">
          Scan the QR code at each station to collect its stamp. Your progress stays on this browser and device.
        </Text>
      </Stack>

      {!isPersistent && (
        <Alert color="orange" icon={<IconAlertTriangle size={20} />} title="Progress cannot be saved">
          Browser storage is unavailable. Keep this page open to avoid losing collected stamps.
        </Alert>
      )}

      {isComplete && (
        <Alert
          color="ualbertaGreen"
          icon={<IconRosetteDiscountCheck size={22} />}
          title="Passport complete"
        >
          You collected every available stamp. Completion details will be announced by the event organizers.
        </Alert>
      )}

      <Card className="passport-progress" withBorder radius="md" padding="lg">
        <Group justify="space-between" align="flex-end" mb="sm">
          <div>
            <Text size="sm" c="dimmed" fw={650}>Collection progress</Text>
            <Text size="xl" fw={750}>{collectedCount} of {booths.length} stamps</Text>
          </div>
          <ThemeIcon color="ualbertaGold" variant="light" size="xl">
            <IconQrcode size={24} stroke={1.8} />
          </ThemeIcon>
        </Group>
        <Progress
          value={progress}
          color="ualbertaGreen"
          size="lg"
          radius="xl"
          aria-label={`${collectedCount} of ${booths.length} stamps collected`}
        />
        <Group justify="space-between" mt="md" align="center">
          <Text size="xs" c="dimmed">Passport {state.passportId.slice(0, 8)}</Text>
          <Button
            variant="subtle"
            color="red"
            size="compact-sm"
            leftSection={<IconRefresh size={16} />}
            onClick={openReset}
          >
            Reset passport
          </Button>
        </Group>
      </Card>

      <div>
        <Title order={2} size="h3" mb="md">Stamp collection</Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          {booths.map((booth) => {
            const collected = collectedStampIds.has(booth.stamp.id);
            return (
              <Card
                key={booth.stamp.id}
                className="stamp-card"
                data-collected={collected || undefined}
                withBorder
                radius="md"
                padding="lg"
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <ThemeIcon
                    color={collected ? "ualbertaGreen" : "gray"}
                    variant={collected ? "light" : "default"}
                    size="xl"
                    radius="xl"
                  >
                    {collected ? <IconCheck size={22} /> : <IconLock size={20} />}
                  </ThemeIcon>
                  <Badge color={collected ? "ualbertaGreen" : "gray"} variant="light">
                    {collected ? "Collected" : "Locked"}
                  </Badge>
                </Group>
                <Title order={3} size="h4" mt="lg">
                  {collected ? booth.stamp.name : booth.name}
                </Title>
                <Text c="dimmed" size="sm" mt={6}>
                  {collected ? booth.stamp.description : `Visit ${booth.name} to unlock this stamp.`}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </div>

      <Modal opened={resetOpened} onClose={closeReset} title="Reset passport?" centered>
        <Text c="dimmed">
          This permanently removes every collected stamp from this browser.
        </Text>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={closeReset}>Cancel</Button>
          <Button color="red" onClick={handleReset}>Reset passport</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
