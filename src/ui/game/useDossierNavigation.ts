import { useCallback, useReducer } from "react";

export interface DossierNavigationState {
  readonly selectedNodeId?: string;
  readonly crisis?: { readonly id: string; readonly returnToReport: boolean };
  readonly reportOpen: boolean;
}

export type DossierNavigationAction =
  | { readonly type: "open-node"; readonly nodeId: string }
  | { readonly type: "open-node-from-crisis"; readonly nodeId: string }
  | { readonly type: "close-node" }
  | { readonly type: "open-crisis"; readonly crisisId: string }
  | { readonly type: "open-crisis-from-report"; readonly crisisId: string }
  | { readonly type: "close-crisis" }
  | { readonly type: "open-report" }
  | { readonly type: "review-final-state" }
  | { readonly type: "reset" };

/** Pure overlay transition, kept separate from the simulation snapshot. */
export function moveDossierNavigation(
  state: DossierNavigationState,
  action: DossierNavigationAction,
): DossierNavigationState {
  switch (action.type) {
    case "open-node":
      return { ...state, selectedNodeId: action.nodeId, crisis: undefined };
    case "open-node-from-crisis":
      return { ...state, selectedNodeId: action.nodeId };
    case "close-node":
      return { ...state, selectedNodeId: undefined };
    case "open-crisis":
      return {
        ...state,
        selectedNodeId: undefined,
        crisis: { id: action.crisisId, returnToReport: false },
      };
    case "open-crisis-from-report":
      return {
        ...state,
        selectedNodeId: undefined,
        reportOpen: false,
        crisis: { id: action.crisisId, returnToReport: true },
      };
    case "close-crisis":
      return {
        ...state,
        crisis: undefined,
        reportOpen: state.reportOpen || Boolean(state.crisis?.returnToReport),
      };
    case "open-report":
      return {
        ...state,
        selectedNodeId: undefined,
        crisis: undefined,
        reportOpen: true,
      };
    case "review-final-state":
      return { ...state, reportOpen: false };
    case "reset":
      return { reportOpen: false };
  }
}

/** Coordinates the report, crisis dossier, and node dossier overlay stack. */
export function useDossierNavigation(initialReportOpen: boolean) {
  const [state, dispatch] = useReducer(moveDossierNavigation, {
    reportOpen: initialReportOpen,
  });
  const openReport = useCallback(() => dispatch({ type: "open-report" }), []);

  return {
    selectedNodeId: state.selectedNodeId,
    selectedCrisisId: state.crisis?.id,
    reportOpen: state.reportOpen,
    openNode: (nodeId: string) => dispatch({ type: "open-node", nodeId }),
    openNodeFromCrisis: (nodeId: string) =>
      dispatch({ type: "open-node-from-crisis", nodeId }),
    closeNode: () => dispatch({ type: "close-node" }),
    openCrisis: (crisisId: string) =>
      dispatch({ type: "open-crisis", crisisId }),
    openCrisisFromReport: (crisisId: string) =>
      dispatch({ type: "open-crisis-from-report", crisisId }),
    closeCrisis: () => dispatch({ type: "close-crisis" }),
    openReport,
    reviewFinalState: () => dispatch({ type: "review-final-state" }),
    reset: () => dispatch({ type: "reset" }),
  };
}
