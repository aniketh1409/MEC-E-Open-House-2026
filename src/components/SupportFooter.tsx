import { Anchor, Box, Container, Divider, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";

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
            Have a question or need assistance during your visit?{" "}
            <Anchor component={Link} to="/help" size="sm" fw={700}>
              Visit Help &amp; Support
            </Anchor>
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}