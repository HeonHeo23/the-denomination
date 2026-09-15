export const INTERFACE_SOUND_STORAGE_KEY =
  "denomination.interface-sounds-muted";

export interface PreferenceStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

export function readInterfaceSoundMuted(
  storage: PreferenceStorage | undefined,
): boolean {
  try {
    return storage?.getItem(INTERFACE_SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeInterfaceSoundMuted(
  storage: PreferenceStorage | undefined,
  muted: boolean,
): void {
  try {
    storage?.setItem(INTERFACE_SOUND_STORAGE_KEY, String(muted));
  } catch {
    /* Interface audio remains usable when storage is unavailable. */
  }
}

export function shouldPlayInterfaceCue(
  lastPlayedAt: number | undefined,
  now: number,
  muted: boolean,
  throttleMs = 90,
): boolean {
  return (
    !muted && (lastPlayedAt === undefined || now - lastPlayedAt >= throttleMs)
  );
}
