import { Alert, Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconQrcode, IconRefresh } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CompletionCelebration } from "../components/passport/CompletionCelebration";
import { StickerChallenge } from "../components/passport/StickerChallenge";
import { CompletionSeal, Sticker } from "../components/passport/Sticker";
import { features } from "../config/features";
import { usePassport } from "../hooks/usePassport";
import { getActiveBooths, getRequiredBooths, type BoothDetails } from "../lib/content";
import { loadDrawEntry } from "../lib/draw";
import { getTourStopByBoothId } from "../lib/map";
import { getEventInfo } from "../lib/schedule";
import logoUrl from "../../assets/images/ualberta-logo.webp";

const booths = getActiveBooths();
/** Bonus stickers are shown but don't count towards completing the passport. */
const requiredBooths = getRequiredBooths();

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
  const collectedStampIds = new Set(state.collectedStamps);
  const total = requiredBooths.length;
  const collectedCount = requiredBooths.filter((booth) => collectedStampIds.has(booth.stamp.id)).length;
  const isComplete = total > 0 && collectedCount === total;
  const progress = total === 0 ? 0 : (collectedCount / total) * 100;
  // Celebrate only when the sticker just collected was the last required one, not a bonus afterwards.
  const justCompleted = isComplete && requiredBooths.some((booth) => booth.stamp.id === newStampId);
  const showChallenge = getEventInfo().drawEnabled === true && !loadDrawEntry();

  const handleReset = () => {
    resetPassport();
    closeReset();
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
              <span className="passport-count-total"> / {total} stamps</span>
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
            aria-label={`${collectedCount} of ${total} stamps collected`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={collectedCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Group justify="space-between" gap="sm" mt="md">
          <Button component={Link} to="/passport/scan" leftSection={<IconQrcode size={19} />} className="passport-scan-button">
            Scan a stall code
          </Button>
        </Group>
      </div>

      {/* The contest notice, until this visitor has entered the draw. Once the passport is complete
          it moves below the completion card, so the entry button stays on the first screen. */}
      {showChallenge && !isComplete && <StickerChallenge />}

      {!isPersistent && (
        <Alert color="orange" icon={<IconAlertTriangle size={20} />} title="Progress cannot be saved">
          Browser storage is unavailable. Keep this page open to avoid losing collected stamps.
        </Alert>
      )}

      {isComplete ? (
        <>
          <CompletionCelebration total={total} burst={justCompleted} />
          {showChallenge && <StickerChallenge />}
        </>
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
                    data-bonus={booth.stamp.bonus || undefined}
                    style={{ "--delay": `${index * 40}ms` } as CSSProperties}
                  >
                    {booth.stamp.bonus && <span className="sticker-bonus-tag">Bonus</span>}
                    <Sticker
                      stampId={booth.stamp.id}
                      name={booth.stamp.name}
                      tilt={collected ? TILTS[(index + section.id.length) % TILTS.length] : 0}
                      animate={booth.stamp.id === newStampId}
                      locked={!collected}
                    />
                    <Text size="sm" fw={750} ta="center" lh={1.25} mt="xs">
                      {collected ? booth.stamp.name : booth.name}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center" lh={1.3}>
                      {collected ? booth.stamp.description : booth.stamp.bonus ? "Optional: not needed to complete" : "Visit to collect"}
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
          <Text size="sm" c="dimmed">
            Collect all {total} stickers to earn the Certified Explorer seal
            {total < booths.length ? " (bonus stickers are optional)" : ""}.
          </Text>
        </div>
      )}

      {features.passportReset && (
        <Group justify="flex-end" align="center">
          <Button variant="subtle" color="red" size="compact-sm" leftSection={<IconRefresh size={16} />} onClick={openReset}>
            Reset passport
          </Button>
        </Group>
      )}

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
