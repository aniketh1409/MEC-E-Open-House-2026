import { Anchor, Box, Container, Divider, Stack, Text } from "@mantine/core";

export function SupportFooter() {
  return (
    <Box component="footer" className="support-footer">
      <Container size="lg">
        <Divider />

        <Stack gap={4} py="md">
          <Text size="sm" fw={700}>
            Need help?
          </Text>

          <Text size="xs" c="dimmed">
            General questions:{" "}
            <Anchor href="mailto:APPROVED-GENERAL-EMAIL@example.com">
              APPROVED-GENERAL-EMAIL@example.com
            </Anchor>
          </Text>

          <Text size="xs" c="dimmed">
            Accessibility support:{" "}
            <Anchor href="mailto:APPROVED-ACCESSIBILITY-EMAIL@example.com">
              APPROVED-ACCESSIBILITY-EMAIL@example.com
            </Anchor>
          </Text>

          <Text size="xs" c="dimmed">
            Emergency:{" "}
            <Anchor href="tel:+10000000000">
              APPROVED-EMERGENCY-PHONE
            </Anchor>
          </Text>

          <Text size="xs" c="dimmed" mt="xs">
            Accessibility and emergency contacts are listed separately from
            general event questions.
          </Text>

          <Anchor href="/help" size="sm" mt="xs">
            Full help &amp; support
          </Anchor>
        </Stack>
      </Container>
    </Box>
  );
}