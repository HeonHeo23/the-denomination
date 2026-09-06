import type { ResponseDefinition } from "../domain/definitions";
import type { SimulationState } from "../domain/runtime";

/** Evaluates one declarative response function for an effective source value. */
export function responseValue(
  response: ResponseDefinition,
  sourceValue: number,
  state: SimulationState,
): number {
  switch (response.kind) {
    case "constant":
      return response.value;
    case "linear":
      return (response.intercept ?? 0) + response.coefficient * sourceValue;
    case "power":
      return (
        (response.intercept ?? 0) +
        response.coefficient * sourceValue ** response.exponent
      );
    case "product":
      return (
        (response.intercept ?? 0) +
        response.coefficient *
          sourceValue *
          response.factors.reduce(
            (product, nodeId) => product * state.nodes[nodeId].value,
            1,
          )
      );
  }
}
