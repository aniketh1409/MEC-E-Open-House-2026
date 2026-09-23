import { Box, Button, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import logoUrl from "../../../assets/images/ualberta-logo.png";

export function HomePage() {
  return (
    <section className="home-page" aria-labelledby="home-heading">
      <Box className="home-mobile-heading">
        <Title id="home-heading" order={1}>
          <span className="home-mobile-heading-line">Mechanical Engineering</span>
          <br />
          Open House
        </Title>
      </Box>

      <Box className="home-hero">
        <Box
          component="figure"
          className="home-hero-visual"
          role="img"
          aria-label="University of Alberta crest representing the Mechanical Engineering Open House"
        >
          <img src={logoUrl} alt="" />
          <Text className="home-hero-visual-caption">Mechanical Engineering</Text>
        </Box>

        <Box className="home-hero-editorial">
          <Text className="home-hero-editorial-label">Open House 2026</Text>
          <Title order={2}>The Open House that opens doors.</Title>
        </Box>
      </Box>

      <Box className="home-event-band" aria-label="Event highlight">
        <Text>SEE ENGINEERING IN ACTION</Text>
      </Box>

      <Box className="home-introduction">
        <Stack className="home-introduction-stack" gap="lg">
          <Title order={1}>Mechanical Engineering Open House</Title>
          <Text className="home-introduction-eyebrow">SEE ENGINEERING IN ACTION</Text>
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
