import { Accordion, Badge, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import faqData from "../../data/faq.json";

interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  /** Placeholder answer still waiting on the organizers. */
  toConfirm?: boolean;
}

const faqs = faqData as FaqEntry[];
const categories = [...new Set(faqs.map((faq) => faq.category))];

export function FaqSection() {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return faqs.filter((faq) => {
      const text = `${faq.question} ${faq.answer} ${faq.category}`.toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [query]);

  return (
    <section id="faq" className="faq-section" aria-labelledby="faq-heading">
      <Stack gap="xs" maw={720}>
        <Text className="eyebrow">Frequently asked questions</Text>
        <Title order={2} id="faq-heading">FAQ</Title>
      </Stack>

      <TextInput
        className="faq-search"
        type="search"
        label="Search questions"
        placeholder="Try “parking” or “prize”"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch size={18} stroke={1.8} />}
        mt="md"
        maw={480}
      />

      {matches.length === 0 ? (
        <Paper className="empty-state" withBorder radius="md" p="lg" mt="lg">
          <Text fw={700}>No questions match “{query.trim()}”.</Text>
          <Text c="dimmed" size="sm">Try another word, or ask an Open House volunteer.</Text>
        </Paper>
      ) : (
        categories.map((category) => {
          const entries = matches.filter((faq) => faq.category === category);
          if (entries.length === 0) {
            return null;
          }
          return (
            <div key={category} className="faq-category">
              <Title order={3} size="h5" className="faq-category-title">{category}</Title>
              <Accordion variant="separated" radius="md" chevronPosition="right">
                {entries.map((faq) => (
                  <Accordion.Item key={faq.id} value={faq.id}>
                    <Accordion.Control>
                      <Group gap="xs" wrap="nowrap" justify="space-between">
                        <Text fw={650}>{faq.question}</Text>
                        {faq.toConfirm && (
                          <Badge size="xs" variant="light" color="yellow" c="#6b5a00" style={{ flexShrink: 0 }}>
                            To be confirmed
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text c="dimmed">{faq.answer}</Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          );
        })
      )}
    </section>
  );
}
