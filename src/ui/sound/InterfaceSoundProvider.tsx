import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  readInterfaceSoundMuted,
  shouldPlayInterfaceCue,
  writeInterfaceSoundMuted,
} from "./interfaceSoundPreference";
import {
  InterfaceSoundContext,
  type InterfaceSoundCue,
} from "./interfaceSoundContext";

type AudioContextConstructor = new () => AudioContext;

function browserPreferenceStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const audioWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? audioWindow.webkitAudioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  duration: number,
  gainValue: number,
  delay = 0,
  type: OscillatorType = "sine",
): void {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function paper(context: AudioContext): void {
  const duration = 0.075;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 1450;
  gain.gain.value = 0.018;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
}

function renderCue(context: AudioContext, cue: InterfaceSoundCue): void {
  if (cue === "paper") {
    paper(context);
    return;
  }
  if (cue === "confirm") {
    tone(context, 128, 0.09, 0.035, 0, "triangle");
    tone(context, 192, 0.11, 0.022, 0.035, "sine");
    return;
  }
  if (cue === "advance") {
    tone(context, 174, 0.18, 0.025, 0, "triangle");
    tone(context, 232, 0.22, 0.022, 0.09, "triangle");
    return;
  }
  tone(context, 523, 0.48, 0.02);
  tone(context, 784, 0.58, 0.012, 0.06);
}

export function InterfaceSoundProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [muted, setMuted] = useState(() =>
    readInterfaceSoundMuted(browserPreferenceStorage()),
  );
  const contextRef = useRef<AudioContext | undefined>(undefined);
  const lastCueRef = useRef<Record<string, number>>({});
  const mutedRef = useRef(muted);

  const play = useCallback((cue: InterfaceSoundCue) => {
    if (mutedRef.current) return;
    const now = performance.now();
    if (!shouldPlayInterfaceCue(lastCueRef.current[cue], now, mutedRef.current))
      return;
    lastCueRef.current[cue] = now;
    const Context = audioContextConstructor();
    if (!Context) return;
    try {
      const context = contextRef.current ?? new Context();
      contextRef.current = context;
      void context
        .resume()
        .then(() => renderCue(context, cue))
        .catch(() => undefined);
    } catch {
      /* Web Audio is an enhancement and may be unavailable. */
    }
  }, []);

  const toggle = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      writeInterfaceSoundMuted(browserPreferenceStorage(), next);
      if (next) void contextRef.current?.suspend();
      return next;
    });
  }, []);

  useEffect(
    () => () => {
      void contextRef.current?.close();
      contextRef.current = undefined;
      lastCueRef.current = {};
    },
    [],
  );

  const value = useMemo(() => ({ muted, toggle, play }), [muted, play, toggle]);
  return (
    <InterfaceSoundContext.Provider value={value}>
      {children}
    </InterfaceSoundContext.Provider>
  );
}
