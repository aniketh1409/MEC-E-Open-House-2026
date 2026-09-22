import { Alert, Button, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconTicket } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getActiveBoothByQrCode } from "../lib/content";
import { addStamp, loadPassport, savePassport } from "../lib/passport";

type CollectionStatus = "collected" | "duplicate" | "invalid";

export function CollectStampPage() {
  const { qrCode = "" } = useParams();
  const booth = getActiveBoothByQrCode(qrCode);

  const [result] = useState(() => {
    if (!booth) {
      return { status: "invalid" as CollectionStatus, isPersistent: true };
    }

    const passport = loadPassport();
    const collection = addStamp(passport.state, booth.stamp.id);
    const isPersistent = collection.added
      ? savePassport(collection.state)
      : passport.isPersistent;

    return {
      status: (collection.added ? "collected" : "duplicate") as CollectionStatus,
      isPersistent,
    };
  });

  if (!booth) {
    return (
      <Stack component="section" className="not-found" gap="md">
        <ThemeIcon color="red" variant="light" size={52} radius="xl">
          <IconAlertCircle size={28} />
        </ThemeIcon>
        <Title order={1}>QR code not recognized</Title>
        <Text c="dimmed" size="lg">
          This code does not match an active Open House station.
        </Text>
        <Button component={Link} to="/passport" variant="light" w="fit-content">
          View passport
        </Button>
      </Stack>
    );
  }

  const isDuplicate = result.status === "duplicate";

  return (
    <Stack component="section" className="collection-result" gap="md" align="flex-start">
      <ThemeIcon color="ualbertaGreen" variant="light" size={58} radius="xl">
        {isDuplicate ? <IconTicket size={30} /> : <IconCheck size={30} />}
      </ThemeIcon>
      <Text className="eyebrow">{booth.name}</Text>
      <Title order={1}>{isDuplicate ? "Stamp already collected" : "Stamp collected"}</Title>
      <Text c="dimmed" size="lg">{booth.stamp.name}</Text>
      {!result.isPersistent && (
        <Alert color="orange" title="This stamp could not be saved">
          Browser storage is unavailable. Keep this page open and try again later.
        </Alert>
      )}
      <Button component={Link} to="/passport" w="fit-content">
        View passport
      </Button>
    </Stack>
  );
}
