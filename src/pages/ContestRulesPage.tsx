import { Anchor, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "react-router-dom";

/**
 * The official contest rules, word for word from the department's rules document.
 * Change them only when the department issues new rules.
 */
const RULES: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. Eligibility",
    paragraphs: ["The contest is open to attendees of the University of Alberta Mechanical Engineering Open House."],
  },
  {
    heading: "2. How to Enter",
    paragraphs: [
      "Visit each designated Open House station and scan its QR code to collect the corresponding sticker. Once all required stickers have been collected, submit your name and email address through the contest entry form. No purchase is necessary to enter. Entries must be submitted by **3:00 p.m. Mountain Time on October 17, 2026**.",
    ],
  },
  {
    heading: "3. Prizes",
    paragraphs: ["Four (4) gift cards, each valued at $25 CAD, are available to be won. The total approximate prize value is $100 CAD."],
  },
  {
    heading: "4. Winner Selection",
    paragraphs: [
      "Four winners will be selected by random draw from eligible entries. The draw will take place within three to five business days following the event. The odds of winning depend on the total number of eligible entries received.",
    ],
  },
  {
    heading: "5. Skill-Testing Question",
    paragraphs: ["Each selected winner must correctly answer a mathematical skill-testing question before receiving their prize."],
  },
  {
    heading: "6. Winner Notification",
    paragraphs: [
      "Winners will be contacted using the email address provided at entry. If a selected winner cannot be contacted or does not meet the contest requirements, an alternate winner may be selected.",
    ],
  },
  {
    heading: "7. Personal Information",
    paragraphs: [
      "Names and email addresses will be collected solely for contest administration and winner notification. Personal information will not be retained beyond what is necessary to administer the contest and distribute the prizes, subject to applicable University of Alberta records-retention and privacy requirements.",
    ],
  },
  {
    heading: "8. Contest Administration",
    paragraphs: [
      "The contest is administered by the University of Alberta Department of Mechanical Engineering. The contest will be conducted in accordance with applicable laws and university policies.",
    ],
  },
];

/** Renders **bold** spans in the rules text. */
function withBold(text: string) {
  return text.split(/(\*\*.+?\*\*)/).map((part, index) =>
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

export function ContestRulesPage() {
  return (
    <Stack component="article" gap="lg" maw={720} className="contest-rules" aria-labelledby="contest-rules-heading">
      <Anchor component={Link} to="/passport" size="sm" display="inline-flex" style={{ gap: 4, alignItems: "center" }}>
        <IconArrowLeft size={16} aria-hidden="true" />
        Back to passport
      </Anchor>
      <Stack gap={6}>
        <Text className="eyebrow">Official contest rules</Text>
        <Title id="contest-rules-heading" order={1}>
          Mechanical Engineering Open House Sticker Challenge
        </Title>
        <Text>
          <strong>Contest Date:</strong> October 17, 2026
        </Text>
      </Stack>
      {RULES.map((rule) => (
        <section key={rule.heading}>
          <Title order={2} size="h4" mb={4}>{rule.heading}</Title>
          {rule.paragraphs.map((paragraph) => (
            <Text key={paragraph} lh={1.6}>{withBold(paragraph)}</Text>
          ))}
        </section>
      ))}
    </Stack>
  );
}
