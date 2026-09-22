import {
  Box,
  Button,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section
      className="home-hero"
      aria-labelledby="home-heading home-heading-mobile"
    >
      <Box className="home-mobile-heading">
        <Title id="home-heading-mobile" order={1}>
          <span className="home-mobile-heading-line">Mechanical Engineering</span>
          <br />
          Open House
        </Title>
      </Box>

      <Box
        component="figure"
        className="home-hero-visual"
        role="img"
        aria-label="Mechanical Engineering Open House image placeholder"
      />

      <Box className="home-event-band" aria-label="Event identity">
        <Text>SEE ENGINEERING IN ACTION</Text>
      </Box>

      <Box className="home-hero-content">
        <Stack className="home-hero-stack" gap="lg">
          <Title id="home-heading" order={1}>
            Mechanical Engineering Open House
          </Title>

          <Text className="home-hero-copy">
            Come explore Mechanical Engineering through interactive activities
            throughout the building. Follow a self-guided tour, meet current
            students and faculty, and discover our hands-on spaces, labs, and
            more.
          </Text>

          <Button
            className="home-hero-cta"
            component={Link}
            to="/booths"
            rightSection={<IconArrowRight size={18} stroke={1.8} />}
          >
            Explore the Open House
          </Button>
        </Stack>
      </Box>
    </section>
  );
}