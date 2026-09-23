import { Alert, Button, Group, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { IconAlertCircle, IconCamera, IconKeyboard } from "@tabler/icons-react";
import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getActiveBoothByQrCode } from "../lib/content";
import { getQrCodeFromScan } from "../lib/qr";

const READER_ID = "passport-qr-reader";

export function ScanQrPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToMap = searchParams.get("from") === "map";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>();
  const [manualCode, setManualCode] = useState("");

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner?.isScanning) {
      await scanner.stop();
    }

    scanner?.clear();
    setIsScanning(false);
  };

  useEffect(() => () => {
    void stopScanner();
  }, []);

  const processScan = async (value: string) => {
    const qrCode = getQrCodeFromScan(value, window.location.origin);

    if (!qrCode || !getActiveBoothByQrCode(qrCode)) {
      setError("This QR code does not belong to an active Open House station.");
      return;
    }

    await stopScanner();
    navigate(`/passport/collect/${encodeURIComponent(qrCode)}${returnToMap ? "?from=map" : ""}`);
  };

  const startScanner = async () => {
    setError(undefined);

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Camera scanning requires a secure HTTPS connection.");
      return;
    }

    try {
      const { Html5Qrcode: QrScanner } = await import("html5-qrcode");
      const scanner = new QrScanner(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => void processScan(decodedText),
        () => undefined,
      );
      setIsScanning(true);
    } catch {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      scanner?.clear();
      setError("Camera access was unavailable. Allow camera permission or enter the booth code below.");
    }
  };

  const submitManualCode = () => {
    void processScan(manualCode);
  };

  return (
    <Stack component="section" gap="xl" maw={720} aria-labelledby="scan-heading">
      <Stack gap={6}>
        <Text className="eyebrow">Collect a stamp</Text>
        <Title id="scan-heading" order={1}>Scan booth QR code</Title>
        <Text c="dimmed" size="lg">
          Point your camera at the QR code displayed at the station.
        </Text>
      </Stack>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={20} />} title="Unable to scan">
          {error}
        </Alert>
      )}

      <div id={READER_ID} className="qr-reader" aria-label="QR code camera preview" />

      <Group>
        {!isScanning ? (
          <Button leftSection={<IconCamera size={18} />} onClick={() => void startScanner()}>
            Start camera
          </Button>
        ) : (
          <Button variant="default" onClick={() => void stopScanner()}>
            Stop camera
          </Button>
        )}
      </Group>

      <Stack className="manual-code" gap="sm">
        <Group gap="sm">
          <ThemeIcon variant="light" color="ualbertaGreen">
            <IconKeyboard size={18} />
          </ThemeIcon>
          <Title order={2} size="h4">Enter booth code</Title>
        </Group>
        <TextInput
          label="Booth code"
          placeholder="Example: ecocar"
          value={manualCode}
          onChange={(event) => setManualCode(event.currentTarget.value)}
          onKeyDown={(event) => event.key === "Enter" && submitManualCode()}
        />
        <Button variant="light" w="fit-content" disabled={!manualCode.trim()} onClick={submitManualCode}>
          Collect stamp
        </Button>
      </Stack>
    </Stack>
  );
}
