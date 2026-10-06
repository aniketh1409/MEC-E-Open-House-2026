import { Alert, Button, PasswordInput, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconLock, IconPrinter } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState, type FormEvent } from "react";
import { getActiveBooths } from "../lib/content";
import { getEventInfo } from "../lib/schedule";
import { hashQrPassword } from "../lib/qrPassword";
import { getCollectionUrl } from "../lib/qr";

const booths = getActiveBooths();
const passwordHash = getEventInfo().qrPagePasswordHash;
/** Remembers the unlock for this tab only; a new password locks it again. */
const UNLOCK_KEY = "mece-open-house-qr-unlocked";

function wasUnlocked(): boolean {
  try {
    return Boolean(passwordHash) && sessionStorage.getItem(UNLOCK_KEY) === passwordHash;
  } catch {
    return false;
  }
}

/** Organizer-only page: asks for the password (set on the sheet's Event tab) before showing any code. */
export function QrCodeSheetPage() {
  const [unlocked, setUnlocked] = useState(wasUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);

  if (unlocked) {
    return <QrCodeSheet />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordHash) return;
    setChecking(true);
    const matches = (await hashQrPassword(password)) === passwordHash;
    setChecking(false);
    if (!matches) {
      setError("That password isn't right.");
      return;
    }
    try {
      sessionStorage.setItem(UNLOCK_KEY, passwordHash);
    } catch {
      // Storage unavailable: unlocked until the page is reloaded.
    }
    setUnlocked(true);
  };

  return (
    <Paper component="section" className="qr-lock" withBorder radius="md" p="xl" aria-labelledby="qr-lock-heading">
      <Stack gap="md" component="form" onSubmit={submit}>
        <IconLock size={32} stroke={1.6} className="qr-lock-icon" aria-hidden="true" />
        <div>
          <Text className="eyebrow">Event setup</Text>
          <Title order={1} size="h2" id="qr-lock-heading">Stall QR codes</Title>
          <Text c="dimmed" mt={4}>This page is for organizers. Enter the password to see and print the QR codes.</Text>
        </div>
        {passwordHash ? (
          <>
            <PasswordInput
              label="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                setError(undefined);
              }}
              error={error}
              autoFocus
              autoComplete="current-password"
            />
            <Button type="submit" loading={checking} disabled={!password} w="fit-content">
              Unlock
            </Button>
          </>
        ) : (
          <Alert color="orange">No password has been set yet. Set one on the content sheet's Event tab (QR codes page password).</Alert>
        )}
      </Stack>
    </Paper>
  );
}

interface GeneratedQrCode {
  boothId: string;
  imageUrl: string;
  collectionUrl: string;
}

function QrCodeSheet() {
  const [codes, setCodes] = useState<GeneratedQrCode[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const configuredOrigin = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
    const origin = configuredOrigin || window.location.origin;

    void Promise.all(
      booths.map(async (booth) => {
        const collectionUrl = getCollectionUrl(booth.qrCode, origin);
        const imageUrl = await QRCode.toDataURL(collectionUrl, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 420,
          color: { dark: "#173622", light: "#ffffff" },
        });
        return { boothId: booth.id, imageUrl, collectionUrl };
      }),
    )
      .then((generatedCodes) => active && setCodes(generatedCodes))
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack component="section" gap="xl" aria-labelledby="qr-sheet-heading">
      <Stack className="print-hidden" gap={6}>
        <Text className="eyebrow">Event setup</Text>
        <Title id="qr-sheet-heading" order={1}>Stall QR codes</Title>
        <Text c="dimmed" maw={720}>
          Print and place the matching code at each stall. Set VITE_PUBLIC_SITE_URL to the deployed website before producing final copies.
        </Text>
        <Button leftSection={<IconPrinter size={18} />} w="fit-content" onClick={() => window.print()}>
          Print QR sheet
        </Button>
      </Stack>

      {failed && <Alert color="red">The QR codes could not be generated.</Alert>}

      <SimpleGrid className="qr-sheet" cols={{ base: 1, sm: 2 }} spacing="lg">
        {booths.map((booth) => {
          const code = codes.find((candidate) => candidate.boothId === booth.id);
          return (
            <article className="qr-print-card" key={booth.id}>
              <Text className="qr-event-name">MEC E Open House 2026</Text>
              <Title order={2} size="h3">{booth.name}</Title>
              {code ? <img src={code.imageUrl} alt={`QR code for ${booth.name}`} /> : <div className="qr-placeholder" />}
              <Text fw={700}>{booth.qrCode}</Text>
              <Text size="xs" c="dimmed" className="qr-url">{code?.collectionUrl}</Text>
            </article>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
