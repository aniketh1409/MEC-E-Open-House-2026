import { Alert, Button, Group, Modal, Stack, Switch, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconQrcode, IconRefresh } from "@tabler/icons-react";
import { useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CompletionCelebration } from "../components/passport/CompletionCelebration";
import { CompletionSeal, Sticker, StickerSlot } from "../components/passport/Sticker";
import { usePassport } from "../hooks/usePassport";
import { isSoundEnabled, setSoundEnabled } from "../lib/celebrate";
import { getActiveBooths, type BoothDetails } from "../lib/content";
import { getTourStopByBoothId } from "../lib/map";
import logoUrl from "../../assets/images/ualberta-logo.png";

const booths = getActiveBooths();

/** Resting tilts so a page of stickers looks hand-placed. */
const TILTS = [-6, 4, -2, 5, -4, 3, -5, 2];

interface PassportSection {
  id: string;
  title: string;
  booths: BoothDetails[];
}

/** Campus stations first, then the building tour floor by floor, in tour order. */
function buildSections(): PassportSection[] {
  const campus = booths.filter((booth) => !getTourStopByBoothId(booth.id));
  const tour = booths
    .map((booth) => ({ booth, stop: getTourStopByBoothId(booth.id) }))
    .filter((entry) => entry.stop)
    .sort((first, second) => first.stop!.number - second.stop!.number);

  const floors = new Map<number, PassportSection>();
  for (const { booth, stop } of tour) {
    const floor = stop!.floorPlan.floor;
    if (!floors.has(floor)) {
      floors.set(floor, { id: `floor-${floor}`, title: `MEC E · ${stop!.floorPlan.label}`, booths: [] });
    }
    floors.get(floor)!.booths.push(booth);
  }

  return [
    ...(campus.length ? [{ id: "campus", title: "On campus", booths: campus }] : []),
    ...[...floors.entries()].sort(([first], [second]) => first - second).map(([, section]) => section),
  ];
}

const sections = buildSections();

export function PassportPage() {
  const { state, isPersistent, resetPassport } = usePassport();
  const [searchParams] = useSearchParams();
  const newStampId = searchParams.get("new");
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const collectedStampIds = new Set(state.collectedStamps);
  const collectedCount = booths.filter((booth) => collectedStampIds.has(booth.stamp.id)).length;
  const isComplete = booths.length > 0 && collectedCount === booths.length;
  const progress = booths.length === 0 ? 0 : (collectedCount / booths.length) * 100;
  const justCompleted = isComplete && Boolean(newStampId);

  const handleReset = () => {
    resetPassport();
    closeReset();
  };

  const toggleSound = (enabled: boolean) => {
    setSoundOn(enabled);
    setSoundEnabled(enabled);
  };

  return (
    <Stack component="section" gap="xl" aria-labelledby="passport-heading">
      <div className="passport-cover" data-complete={isComplete || undefined}>
        <div className="passport-cover-top">
          <img src={logoUrl} alt="" className="passport-cover-crest" />
          <div>
            <Text className="passport-cover-kicker">Mechanical Engineering · Open House 2026</Text>
            <Title id="passport-heading" order={1} className="passport-cover-title">Passport</Title>
          </div>
        </div>

        <div className="passport-cover-progress">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text className="passport-count" aria-live="polite">
              <span key={collectedCount} className="passport-count-value">{collectedCount}</span>
              <span className="passport-count-total"> / {booths.length} stamps</span>
            </Text>
            {isComplete && (
              <span className="passport-complete-stamp" data-animate={justCompleted || undefined} aria-hidden="true">
                Complete
              </span>
            )}
          </Group>
          <div
            className="passport-meter"
            role="progressbar"
            aria-label={`${collectedCount} of ${booths.length} stamps collected`}
            aria-valuemin={0}
            aria-valuemax={booths.length}
            aria-valuenow={collectedCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Group justify="space-between" gap="sm" mt="md">
          <Button component={Link} to="/passport/scan" leftSection={<IconQrcode size={19} />} className="passport-scan-button">
            Scan a booth code
          </Button>
          <Switch
            className="passport-sound"
            label="Sound effects"
            checked={soundOn}
            onChange={(event) => toggleSound(event.currentTarget.checked)}
            color="ualbertaGold.5"
          />
        </Group>
      </div>

      {!isPersistent && (
        <Alert color="orange" icon={<IconAlertTriangle size={20} />} title="Progress cannot be saved">
          Browser storage is unavailable. Keep this page open to avoid losing collected stamps.
        </Alert>
      )}

      {isComplete ? (
        <CompletionCelebration total={booths.length} burst={justCompleted} />
      ) : (
        <Text c="dimmed" maw={680}>
          Scan the QR code at each station to collect its sticker. Your passport stays on this browser and device.
        </Text>
      )}

      {sections.map((section) => {
        const sectionCollected = section.booths.filter((booth) => collectedStampIds.has(booth.stamp.id)).length;
        return (
          <section key={section.id} className="passport-page" aria-labelledby={`passport-${section.id}`}>
            <Group justify="space-between" align="baseline" className="passport-page-header">
              <Title order={2} size="h4" id={`passport-${section.id}`}>{section.title}</Title>
              <Text size="sm" fw={700} c="dimmed">{sectionCollected} of {section.booths.length}</Text>
            </Group>
            <ul className="sticker-grid">
              {section.booths.map((booth, index) => {
                const collected = collectedStampIds.has(booth.stamp.id);
                return (
                  <li
                    key={booth.stamp.id}
                    className="sticker-cell"
                    data-collected={collected || undefined}
                    style={{ "--delay": `${index * 40}ms` } as CSSProperties}
                  >
                    {collected ? (
                      <Sticker
                        stampId={booth.stamp.id}
                        name={booth.stamp.name}
                        tilt={TILTS[(index + section.id.length) % TILTS.length]}
                        animate={booth.stamp.id === newStampId}
                      />
                    ) : (
                      <StickerSlot label={booth.name} />
                    )}
                    <Text size="sm" fw={750} ta="center" lh={1.25} mt="xs">
                      {collected ? booth.stamp.name : booth.name}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center" lh={1.3}>
                      {collected ? booth.stamp.description : "Visit to collect"}
                    </Text>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {!isComplete && (
        <div className="passport-locked-seal">
          <CompletionSeal size={96} />
          <Text size="sm" c="dimmed">Collect all {booths.length} stickers to earn the Certified Explorer seal.</Text>
        </div>
      )}

      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">Passport {state.passportId.slice(0, 8)}</Text>
        <Button variant="subtle" color="red" size="compact-sm" leftSection={<IconRefresh size={16} />} onClick={openReset}>
          Reset passport
        </Button>
      </Group>

      <Modal opened={resetOpened} onClose={closeReset} title="Reset passport?" centered>
        <Text c="dimmed">This permanently removes every collected stamp from this browser.</Text>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={closeReset}>Cancel</Button>
          <Button color="red" onClick={handleReset}>Reset passport</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
