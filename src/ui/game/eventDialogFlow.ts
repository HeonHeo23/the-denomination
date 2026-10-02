export type EventPresentation =
  | {
      readonly mode: "automatic";
      readonly returnTo?: "ending";
      readonly ids: readonly string[];
      readonly index: number;
    }
  | {
      readonly mode: "manual";
      readonly id: string;
      readonly returnTo: "report" | "chronicle";
    };

export function beginAutomaticEvents(
  ids: readonly string[],
  returnTo?: "ending",
): EventPresentation | undefined {
  return ids.length
    ? { mode: "automatic", ids, index: 0, ...(returnTo ? { returnTo } : {}) }
    : undefined;
}

export function closeEventPresentation(presentation: EventPresentation): {
  readonly next?: EventPresentation;
  readonly returnTo?: "report" | "chronicle" | "ending";
} {
  if (presentation.mode === "manual")
    return { returnTo: presentation.returnTo };
  if (presentation.index + 1 < presentation.ids.length)
    return { next: { ...presentation, index: presentation.index + 1 } };
  return { returnTo: presentation.returnTo ?? "report" };
}
