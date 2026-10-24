import { useCallback, useReducer } from "react";
import type { OutcomeCondition } from "./outcomeViews";

export interface DossierNavigationState {
  readonly selectedNodeId?: string;
  readonly condition?: OutcomeCondition;
  readonly reportOpen: boolean;
}

export type DossierNavigationAction =
  | { readonly type: "open-node"; readonly nodeId: string }
  | { readonly type: "close-node" }
  | { readonly type: "open-condition"; readonly condition: OutcomeCondition }
  | { readonly type: "close-condition" }
  | { readonly type: "open-report" }
  | { readonly type: "review-final-state" }
  | { readonly type: "reset" };

/** Parent surfaces remain open beneath linked condition and node dossiers. */
export function moveDossierNavigation(
  state: DossierNavigationState,
  action: DossierNavigationAction,
): DossierNavigationState {
  switch (action.type) {
    case "open-node":
      return { ...state, selectedNodeId: action.nodeId };
    case "close-node":
      return { ...state, selectedNodeId: undefined };
    case "open-condition":
      return {
        ...state,
        selectedNodeId: undefined,
        condition: action.condition,
      };
    case "close-condition":
      return { ...state, condition: undefined };
    case "open-report":
      return { reportOpen: true };
    case "review-final-state":
      return { ...state, reportOpen: false };
    case "reset":
      return { reportOpen: false };
  }
}

export function useDossierNavigation(initialReportOpen: boolean) {
  const [state, dispatch] = useReducer(moveDossierNavigation, {
    reportOpen: initialReportOpen,
  });
  const openReport = useCallback(() => dispatch({ type: "open-report" }), []);
  return {
    selectedNodeId: state.selectedNodeId,
    selectedCondition: state.condition,
    reportOpen: state.reportOpen,
    openNode: (nodeId: string) => dispatch({ type: "open-node", nodeId }),
    closeNode: () => dispatch({ type: "close-node" }),
    openCondition: (condition: OutcomeCondition) =>
      dispatch({ type: "open-condition", condition }),
    closeCondition: () => dispatch({ type: "close-condition" }),
    openReport,
    reviewFinalState: () => dispatch({ type: "review-final-state" }),
    reset: () => dispatch({ type: "reset" }),
  };
}
