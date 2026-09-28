/**
 * Sound and vibration for collecting stamps. Sounds are synthesized with the Web Audio API
 * (no audio files) and only play when the visitor has turned sound on.
 */

const SOUND_KEY = "mece-open-house-sound";

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  const AudioContextClass = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return undefined;
  }
  audioContext ??= new AudioContextClass();
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

/** A sticker being slapped onto paper: a short noise burst over a low thump. */
function playSlap(context: AudioContext) {
  const now = context.currentTime;

  const noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.09), context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length) ** 3;
  }
  const burst = context.createBufferSource();
  burst.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  const burstGain = context.createGain();
  burstGain.gain.value = 0.5;
  burst.connect(filter).connect(burstGain).connect(context.destination);
  burst.start(now);

  const thump = context.createOscillator();
  thump.frequency.setValueAtTime(140, now);
  thump.frequency.exponentialRampToValueAtTime(50, now + 0.12);
  const thumpGain = context.createGain();
  thumpGain.gain.setValueAtTime(0.45, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  thump.connect(thumpGain).connect(context.destination);
  thump.start(now);
  thump.stop(now + 0.17);
}

/** A short rising arpeggio for finishing the passport. */
function playFanfare(context: AudioContext) {
  const now = context.currentTime + 0.05;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    const start = now + index * 0.11;
    const note = context.createOscillator();
    note.type = "triangle";
    note.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (index === 3 ? 0.6 : 0.2));
    note.connect(gain).connect(context.destination);
    note.start(start);
    note.stop(start + 0.65);
  });
}

/** Feedback for a newly collected stamp; `complete` adds the fanfare. */
export function celebrateStamp({ complete = false }: { complete?: boolean } = {}): void {
  navigator.vibrate?.(complete ? [15, 60, 15, 60, 40] : [12, 40, 18]);

  if (!isSoundEnabled()) {
    return;
  }
  try {
    const context = getAudioContext();
    if (context) {
      playSlap(context);
      if (complete) {
        playFanfare(context);
      }
    }
  } catch {
    // Audio is a nice-to-have; ignore failures.
  }
}
