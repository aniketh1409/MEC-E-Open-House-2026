import { Stack, Text, Title } from "@mantine/core";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Stack component="section" gap="xs" maw={680}>
      <Text className="eyebrow">MEC E Open House 2026</Text>
      <Title order={1}>{title}</Title>
      <Text c="dimmed" size="lg">
        Content is being prepared for the 2026 Open House.
      </Text>
    </Stack>
  );
}
