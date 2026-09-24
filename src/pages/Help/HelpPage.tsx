import {
  Anchor,
  Button,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconExternalLink } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import mapPdf from "../../../assets/maps/MECE Tour Map.pdf";

export function HelpPage() {
  return (
    <section className="help-page" aria-labelledby="help-heading">
      <Stack className="help-intro" gap="xs" maw={720}>
        <Text className="eyebrow">Visitor support</Text>
        <Title id="help-heading" order={1}>
          Help &amp; Support
        </Title>
        <Text c="dimmed" size="lg">
          Need a hand during Open House? Find the right contact or resource below.
        </Text>
      </Stack>

      <SimpleGrid className="help-grid" cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
        <Paper className="help-section" component="section" withBorder radius="md" p="lg">
          <Title order={2} size="h3">Event Questions</Title>
          <Text c="dimmed" mt="xs">
            For questions about the Mechanical Engineering Open House, please contact the Faculty of Engineering at the University of Alberta.
          </Text>
          <Text c="dimmed" size="sm" mt="md">
            Official Faculty of Engineering contact details will be added here when approved by the project team.
          </Text>
        </Paper>

        <Paper className="help-section" component="section" withBorder radius="md" p="lg">
          <Title order={2} size="h3">Accessibility</Title>
          <Text c="dimmed" mt="xs">
            Need accessibility or accommodation support during your visit?
          </Text>
          <Stack gap={4} mt="md">
            <Text size="sm">
              Phone: <Anchor href="tel:+17804923381">780-492-3381</Anchor>
            </Text>
            <Text size="sm">
              Email: <Anchor href="mailto:arrec@ualberta.ca">arrec@ualberta.ca</Anchor>
            </Text>
          </Stack>
          <Anchor
            href="https://www.ualberta.ca/en/current-students/accessibility-resources/index.html"
            target="_blank"
            rel="noopener noreferrer"
            mt="md"
            display="inline-flex"
            style={{ gap: "var(--mantine-spacing-xs)", alignItems: "center" }}
          >
            Accessibility &amp; Accommodations
            <IconExternalLink size={15} stroke={1.8} aria-hidden="true" />
          </Anchor>
        </Paper>

        <Paper className="help-section" component="section" withBorder radius="md" p="lg">
          <Title order={2} size="h3">Getting Around</Title>
          <Text c="dimmed" mt="xs">
            Can&apos;t find a booth or activity?
          </Text>
          <Stack className="help-actions" gap="xs" mt="md">
            <Button
              component={Link}
              to="/map"
              variant="subtle"
              fullWidth
              rightSection={<IconArrowRight size={17} stroke={1.8} />}
            >
              Open App Map
            </Button>
            <Button component={Link} to="/schedule" variant="subtle" fullWidth rightSection={<IconArrowRight size={17} stroke={1.8} />}>
              View Schedule
            </Button>
            <Button
              component="a"
              href={mapPdf}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              fullWidth
              rightSection={<IconExternalLink size={17} stroke={1.8} />}
            >
              View PDF Map
            </Button>
          </Stack>
        </Paper>

        <Paper className="help-section help-emergency" component="section" withBorder radius="md" p="lg">
          <Title order={2} size="h3">Safety</Title>
          <Text mt="xs" fw={650}>
            Emergency information is separate from general Open House questions.
          </Text>
          <Stack gap={4} mt="md">
            <Text size="sm">Emergency: <Anchor href="tel:911">911</Anchor></Text>
            <Text size="sm">U of A Protective Services: <Anchor href="tel:+17804925050">780-492-5050</Anchor></Text>
            <Text size="sm">Building Emergency: <Anchor href="tel:+17804925555">780-492-5555</Anchor></Text>
          </Stack>
          <Anchor
            href="https://www.ualberta.ca/en/services/student-services-directory/emergency-information-and-procedures.html"
            target="_blank"
            rel="noopener noreferrer"
            mt="md"
            display="inline-flex"
            style={{ gap: "var(--mantine-spacing-xs)", alignItems: "center" }}
          >
            UAlberta emergency information
            <IconExternalLink size={15} stroke={1.8} aria-hidden="true" />
          </Anchor>
        </Paper>

        <Paper className="help-section" component="section" withBorder radius="md" p="lg">
          <Title order={2} size="h3">Lost &amp; Found</Title>
          <Text c="dimmed" mt="xs">
            Lost something during your visit? Contact event staff for assistance.
          </Text>
        </Paper>
      </SimpleGrid>
    </section>
  );
}
