import { createContext, useContext } from "react";

export type InterfaceSoundCue = "paper" | "confirm" | "advance" | "warning";

export interface InterfaceSoundValue {
  readonly muted: boolean;
  readonly toggle: () => void;
  readonly play: (cue: InterfaceSoundCue) => void;
}

export const InterfaceSoundContext = createContext<
  InterfaceSoundValue | undefined
>(undefined);

export function useInterfaceSound(): InterfaceSoundValue {
  const value = useContext(InterfaceSoundContext);
  if (!value) {
    throw new Error(
      "useInterfaceSound must be used within InterfaceSoundProvider",
    );
  }
  return value;
}
