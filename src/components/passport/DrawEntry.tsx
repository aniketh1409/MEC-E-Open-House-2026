import { Alert, Anchor, Button, Checkbox, Collapse, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { IconCircleCheck, IconCloudUpload, IconGift, IconPencil } from "@tabler/icons-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useNow } from "../../hooks/useNow";
import { useSheetHistory } from "../../hooks/useSheetHistory";
import {
  DrawEntryRejected,
  EMAIL_PATTERN,
  getDrawSettings,
  loadDrawEntry,
  sendPendingEntry,
  submitDrawEntry,
  suggestEmail,
  type SavedDrawEntry,
} from "../../lib/draw";
import { loadPassport } from "../../lib/passport";
import { formatTime } from "../../lib/schedule";

/**
 * "Enter the prize draw" for a completed passport. One entry per passport: entering again updates
 * it (to fix a typo) until the draw closes. Entries made with no signal are sent when it returns.
 */
export function DrawEntry() {
  const settings = getDrawSettings();
  const now = useNow();
  const [saved, setSaved] = useState(loadDrawEntry);
  const isMobile = useIsMobile();
  // On phones the form is a full-screen sheet kept in history, so the Back button closes it.
  const [sheetOpened, setSheetOpened] = useSheetHistory();
  const [dialogOpened, setDialogOpened] = useState(false);
  const opened = isMobile ? sheetOpened : dialogOpened;
  const setOpened = isMobile ? setSheetOpened : setDialogOpened;
  const [notice, setNotice] = useState<string>();

  // Send an entry saved while offline, now and whenever the connection comes back.
  useEffect(() => {
    if (!settings || saved?.status !== "pending") {
      return;
    }
    const retry = () =>
      void sendPendingEntry(settings, loadPassport().state)
        .then((sent) => sent && setSaved(sent))
        .catch((error: unknown) => {
          setSaved(undefined);
          setNotice(error instanceof Error ? `${error.message} Please enter again.` : undefined);
        });
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [saved?.status, settings]);

  if (!settings) {
    return null;
  }

  const isOpen = now <= settings.closesAt;

  return (
    <div className="draw-entry">
      {settings.prize && <Text fw={650} maw={440} size={isMobile ? "sm" : undefined}>{settings.prize}</Text>}
      {notice && <Alert color="orange" mt="xs">{notice}</Alert>}

      {saved ? (
        <Stack gap={6} align="center" mt="sm">
          <Group gap={6} justify="center" c={saved.status === "sent" ? "ualbertaGreen.8" : "orange.8"}>
            {saved.status === "sent" ? <IconCircleCheck size={20} /> : <IconCloudUpload size={20} />}
            <Text fw={800}>{saved.status === "sent" ? "You're entered in the draw!" : "Entry saved, sending when you're back online"}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {saved.name} · {saved.email}
          </Text>
          <div className="draw-entry-code">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Entry code</Text>
            <Text className="draw-entry-code-value">{saved.code}</Text>
          </div>
          <Text size="xs" c="dimmed" maw={320}>
            Take a screenshot of this in case you need to contact us about your entry.
          </Text>
          {isOpen && (
            <Button variant="subtle" size="compact-sm" leftSection={<IconPencil size={15} />} onClick={() => setOpened(true)}>
              Edit entry
            </Button>
          )}
        </Stack>
      ) : isOpen ? (
        <Button mt="sm" size="md" color="ualbertaGold.5" c="ualbertaGreen.9" leftSection={<IconGift size={19} />} onClick={() => setOpened(true)}>
          Enter the prize draw
        </Button>
      ) : (
        <Text size="sm" c="dimmed" mt="sm">The prize draw closed at {formatTime(settings.closesAt)}.</Text>
      )}

      {isOpen && (
        <Text size="xs" c="dimmed" mt={6}>Entries close at {formatTime(settings.closesAt)} today.</Text>
      )}

      <DrawEntryModal
        isMobile={isMobile}
        opened={opened}
        onClose={() => setOpened(false)}
        saved={saved}
        terms={settings.terms}
        onSaved={(entry) => {
          setSaved(entry);
          setNotice(undefined);
          setOpened(false);
        }}
      />
    </div>
  );
}

interface DrawEntryModalProps {
  isMobile: boolean;
  opened: boolean;
  onClose: () => void;
  saved?: SavedDrawEntry;
  terms?: string;
  onSaved: (entry: SavedDrawEntry) => void;
}

function DrawEntryModal({ isMobile, opened, onClose, saved, terms, onSaved }: DrawEntryModalProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  // 16px text on phones: iPhones zoom the page into any smaller field.
  const fieldSize = isMobile ? "md" : "sm";
  const [name, setName] = useState(saved?.name ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [agreed, setAgreed] = useState(Boolean(saved));
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);
  const suggestion = suggestEmail(trimmedEmail);
  const nameValid = name.trim().length >= 2;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTriedSubmit(true);
    if (!nameValid || !emailValid || !agreed) {
      return;
    }
    const settings = getDrawSettings();
    if (!settings) {
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      await submitDrawEntry(settings, loadPassport().state, { name, email });
      onSaved(loadDrawEntry()!);
    } catch (problem) {
      setError(problem instanceof DrawEntryRejected ? problem.message : "Your entry couldn't be saved. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={saved ? "Edit your entry" : "Enter the prize draw"}
      centered
      radius="md"
      fullScreen={isMobile}
      transitionProps={isMobile ? { transition: "slide-up", duration: 220 } : undefined}
      classNames={{ content: "draw-modal" }}
      data-mobile={isMobile || undefined}
    >
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <TextInput
            label="Full name"
            size={fieldSize}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            // The keyboard's Next key moves to the email field instead of submitting the form.
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                emailRef.current?.focus();
              }
            }}
            error={triedSubmit && !nameValid ? "Please enter your full name." : undefined}
            // On phones, let visitors see the whole form before the keyboard covers half of it.
            data-autofocus={!isMobile || undefined}
          />
          <div>
            <TextInput
              ref={emailRef}
              label="Email"
              size={fieldSize}
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              description="We'll only use this to contact you if you win."
              error={triedSubmit && !emailValid ? "Please enter a valid email address." : undefined}
            />
            {suggestion && (
              <Text size="sm" mt={6} className="draw-suggestion">
                Did you mean{" "}
                <Anchor component="button" type="button" fw={700} onClick={() => setEmail(suggestion)}>
                  {suggestion}
                </Anchor>
                ?
              </Text>
            )}
          </div>
          <div>
            <Checkbox
              size={fieldSize}
              className="draw-agree"
              checked={agreed}
              onChange={(event) => setAgreed(event.currentTarget.checked)}
              label="I agree to the prize draw terms"
              error={triedSubmit && !agreed ? "Please agree to the terms to enter." : undefined}
            />
            {terms && (
              <>
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  mt={4}
                  ml={isMobile ? 36 : 30}
                  className="draw-terms-toggle"
                  onClick={() => setShowTerms((value) => !value)}
                >
                  {showTerms ? "Hide the terms" : "Read the terms"}
                </Anchor>
                <Collapse expanded={showTerms}>
                  <Text size="sm" c="dimmed" mt="xs" className="draw-terms">{terms}</Text>
                </Collapse>
              </>
            )}
          </div>
          {error && <Alert color="red">{error}</Alert>}
          {emailValid && <Text size="sm" c="dimmed">Check your email is right: <strong>{trimmedEmail}</strong></Text>}
          {/* On phones the button stays pinned to the bottom of the sheet. */}
          <div className="draw-submit">
            <Button type="submit" size={isMobile ? "lg" : "sm"} loading={sending} color="ualbertaGreen" fullWidth>
              {saved ? "Update my entry" : "Enter the draw"}
            </Button>
          </div>
        </Stack>
      </form>
    </Modal>
  );
}
