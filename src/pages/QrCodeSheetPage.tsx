import { Alert, Button, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { getActiveBooths } from "../lib/content";
import { getCollectionUrl } from "../lib/qr";

const booths = getActiveBooths();

interface GeneratedQrCode {
  boothId: string;
  imageUrl: string;
  collectionUrl: string;
}

export function QrCodeSheetPage() {
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
        <Title id="qr-sheet-heading" order={1}>Booth QR codes</Title>
        <Text c="dimmed" maw={720}>
          Print and place the matching code at each booth. Set VITE_PUBLIC_SITE_URL to the deployed website before producing final copies.
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
