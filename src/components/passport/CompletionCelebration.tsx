import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconShare2 } from "@tabler/icons-react";
import { useState } from "react";
import { Confetti } from "./Confetti";
import { DrawEntry } from "./DrawEntry";
import { CompletionSeal } from "./Sticker";


/** The "passport complete" moment: seal, confetti, prize note and a share button. */
export function CompletionCelebration({ total, burst = true }: { total: number; burst?: boolean }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.origin;
    const shareText = `I collected all ${total} stickers at the UAlberta Mechanical Engineering Open House 2026!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MEC E Open House 2026", text: shareText, url });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
    } catch {
      // Sharing was cancelled or isn't available.
    }
  };

  return (
    <div className="completion-celebration">
      {burst && <Confetti />}
      <Stack align="center" gap="sm" ta="center">
        <CompletionSeal size={168} animate={burst} />
        <Text className="eyebrow" c="ualbertaGreen.8">All {total} stamps collected</Text>
        <Title order={2}>You're a Certified Explorer!</Title>
        <Text c="dimmed" maw={420}>Thanks for exploring Mechanical Engineering!</Text>
        <DrawEntry />
        <Group gap="sm" justify="center" mt="xs">
          <Button variant="light" leftSection={copied ? <IconCheck size={17} /> : <IconShare2 size={17} />} onClick={share}>
            {copied ? "Copied to clipboard" : "Share"}
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
