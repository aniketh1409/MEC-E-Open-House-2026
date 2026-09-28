import { Alert, Button, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertCircle, IconMap2, IconNotebook } from "@tabler/icons-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { CompletionCelebration } from "../components/passport/CompletionCelebration";
import { Sticker } from "../components/passport/Sticker";
import { celebrateStamp } from "../lib/celebrate";
import { getActiveBoothByQrCode, getActiveBooths } from "../lib/content";
import { boothMapPath, stampReturnPath } from "../lib/map";
import { addStamp, loadPassport, savePassport } from "../lib/passport";

type CollectionStatus = "collected" | "duplicate" | "invalid";

const SPARKS = 10;

export function CollectStampPage() {
  const { qrCode = "" } = useParams();
  const [searchParams] = useSearchParams();
  const booth = getActiveBoothByQrCode(qrCode);

  const [result] = useState(() => {
    if (!booth) {
      return { status: "invalid" as CollectionStatus, isPersistent: true, collectedCount: 0, total: 0 };
    }

    const passport = loadPassport();
    const collection = addStamp(passport.state, booth.stamp.id);
    const isPersistent = collection.added
      ? savePassport(collection.state)
      : passport.isPersistent;
    const activeStampIds = getActiveBooths().map((activeBooth) => activeBooth.stamp.id);
    const collected = new Set(collection.state.collectedStamps);

    return {
      status: (collection.added ? "collected" : "duplicate") as CollectionStatus,
      isPersistent,
      collectedCount: activeStampIds.filter((stampId) => collected.has(stampId)).length,
      total: activeStampIds.length,
    };
  });

  const isNew = result.status === "collected";
  const isComplete = isNew && result.total > 0 && result.collectedCount === result.total;
  const returnsToMap = searchParams.get("from") === "map" && result.status !== "invalid" && result.isPersistent;

  useEffect(() => {
    if (isNew && !returnsToMap) {
      celebrateStamp({ complete: isComplete });
    }
  }, [isComplete, isNew, returnsToMap]);

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

  // Scans started from the map go straight back to it, unless there's a storage warning to show.
  if (returnsToMap && result.status !== "invalid") {
    return <Navigate to={stampReturnPath(booth.id, result.status)} replace />;
  }

  return (
    <Stack component="section" className="collection-result" gap="md" align="center" ta="center">
      <div className="sticker-drop" data-new={isNew || undefined}>
        {isNew && <span className="sticker-drop-ring" aria-hidden="true" />}
        {isNew && (
          <span className="sticker-sparks" aria-hidden="true">
            {Array.from({ length: SPARKS }, (_, index) => (
              <span key={index} style={{ "--angle": `${(index / SPARKS) * 360}deg` } as CSSProperties} />
            ))}
          </span>
        )}
        <Sticker stampId={booth.stamp.id} name={booth.stamp.name} size={200} animate={isNew} tilt={-4} />
      </div>

      <Text className="eyebrow">{booth.name}</Text>
      <Title order={1}>{isNew ? "Sticker collected!" : "Already in your passport"}</Title>
      <Text c="dimmed" size="lg" maw={460}>
        {isNew ? (
          <>
            <strong>{booth.stamp.name}</strong> · {result.collectedCount} of {result.total} collected
          </>
        ) : (
          <>You already have the <strong>{booth.stamp.name}</strong> sticker.</>
        )}
      </Text>

      {!result.isPersistent && (
        <Alert color="orange" title="This stamp could not be saved" ta="left">
          Browser storage is unavailable. Keep this page open and try again later.
        </Alert>
      )}

      {isComplete && <CompletionCelebration total={result.total} />}

      <Group gap="sm" justify="center">
        <Button component={Link} to={`/passport?new=${encodeURIComponent(booth.stamp.id)}`} leftSection={<IconNotebook size={18} />}>
          View passport
        </Button>
        {!isComplete && (
          <Button component={Link} to={boothMapPath(booth.id, true)} variant="light" leftSection={<IconMap2 size={18} />}>
            Find your next stop
          </Button>
        )}
      </Group>
    </Stack>
  );
}
