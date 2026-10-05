/** A short vibration for collecting a sticker; a longer pattern for completing the passport. */
export function celebrateStamp({ complete = false }: { complete?: boolean } = {}): void {
  navigator.vibrate?.(complete ? [15, 60, 15, 60, 40] : [12, 40, 18]);
}
