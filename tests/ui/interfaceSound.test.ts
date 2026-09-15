import {
  INTERFACE_SOUND_STORAGE_KEY,
  readInterfaceSoundMuted,
  shouldPlayInterfaceCue,
  writeInterfaceSoundMuted,
} from "../../src/ui/sound/interfaceSoundPreference";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runInterfaceSoundTests() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Pick<Storage, "getItem" | "setItem"> as Storage;

  assert(
    !readInterfaceSoundMuted(storage),
    "Interface sounds should default on",
  );
  writeInterfaceSoundMuted(storage, true);
  assert(
    values.get(INTERFACE_SOUND_STORAGE_KEY) === "true" &&
      readInterfaceSoundMuted(storage),
    "The interface-sound preference should persist separately",
  );

  const unavailable = {
    getItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    },
  } as unknown as Storage;
  assert(
    !readInterfaceSoundMuted(unavailable),
    "Unavailable storage should retain the audible default",
  );
  writeInterfaceSoundMuted(unavailable, true);
  assert(
    shouldPlayInterfaceCue(undefined, 0, false),
    "The first deliberate cue should play immediately",
  );
  assert(
    !shouldPlayInterfaceCue(100, 150, false) &&
      shouldPlayInterfaceCue(100, 190, false),
    "Repeated cues should be throttled for the configured interval",
  );
  assert(
    !shouldPlayInterfaceCue(undefined, 100, true),
    "Muted interface cues should never play",
  );
}
