import { Button, Stack, Text, Title } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useState } from "react";
import { CompletionSeal, Sticker } from "../components/passport/Sticker";
import { getActiveBooths } from "../lib/content";

const booths = getActiveBooths();

/** Every sticker on one page, for reviewing the artwork (like /qr-codes, not linked from the menu). */
export function StickerSheetPage() {
  const [replay, setReplay] = useState(0);

  return (
    <Stack gap="lg">
      <div>
        <Text className="eyebrow">Passport artwork</Text>
        <Title order={1}>Sticker sheet</Title>
        <Text c="dimmed">Placeholder designs, one per stamp. Student-group stickers shimmer.</Text>
      </div>
      <Button variant="light" w="fit-content" leftSection={<IconPlayerPlay size={16} />} onClick={() => setReplay((count) => count + 1)}>
        Replay the collect animation
      </Button>
      <ul className="sticker-grid passport-page" key={replay}>
        {booths.map((booth, index) => (
          <li key={booth.stamp.id} className="sticker-cell" data-collected>
            <Sticker stampId={booth.stamp.id} name={booth.stamp.name} animate={replay > 0} tilt={index % 2 ? 3 : -3} />
            <Text size="sm" fw={750} ta="center" mt="xs">{booth.stamp.name}</Text>
            <Text size="xs" c="dimmed" ta="center">{booth.name}</Text>
          </li>
        ))}
        <li className="sticker-cell" data-collected>
          <CompletionSeal size={132} animate={replay > 0} />
          <Text size="sm" fw={750} ta="center" mt="xs">Certified Explorer</Text>
          <Text size="xs" c="dimmed" ta="center">All stamps collected</Text>
        </li>
      </ul>
    </Stack>
  );
}
