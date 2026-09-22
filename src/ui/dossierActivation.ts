import type { KeyboardEvent, MouseEvent } from "react";

export function getDossierTriggerProps(
  label: string,
  onActivate: () => void,
  stopPropagation = false,
) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (stopPropagation) event.stopPropagation();
      onActivate();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      onActivate();
    },
  };
}
