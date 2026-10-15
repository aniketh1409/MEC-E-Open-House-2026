import { Anchor, Group, Stack, Text, Title } from "@mantine/core";
import { IconGift } from "@tabler/icons-react";
import { Link } from "react-router-dom";

/**
 * The contest notice the department asked for on the Passport page, linking to the full rules.
 * Wording approved by the department; keep it in step with ContestRulesPage.
 */
export function StickerChallenge() {
  return (
    <section className="sticker-challenge" aria-labelledby="sticker-challenge-heading">
      <Group gap="xs" wrap="nowrap" align="center">
        <IconGift size={22} className="sticker-challenge-icon" aria-hidden="true" />
        <Title order={2} size="h4" id="sticker-challenge-heading">
          Mechanical Engineering Open House Sticker Challenge
        </Title>
      </Group>
      <Stack gap="xs" mt="xs">
        <Text size="sm">
          Visit each Open House station on October 17 and scan the QR code to collect the corresponding sticker. Once you
          have collected all required stickers, submit your name and email address for a chance to win one of four gift
          cards, each valued at $25.
        </Text>
        <Text size="sm">
          No purchase is necessary to enter. The contest takes place on October 17, 2026. Full contest rules are available
          on the{" "}
          <Anchor component={Link} to="/contest-rules" fw={700}>
            contest rules page
          </Anchor>
          . Selected winners must correctly answer a skill-testing question to claim their prize.
        </Text>
        <Text size="sm" c="dimmed">
          By entering, participants agree to be contacted by email regarding contest administration and prize notification.
        </Text>
      </Stack>
    </section>
  );
}
