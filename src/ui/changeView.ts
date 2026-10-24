import type {
  FactionMetricDefinition,
  NodeType,
  NumericDomain,
} from "../simulation";

/** Display fields for a net Report change or a recorded Event consequence. */
export interface ChangeView {
  readonly id: string;
  readonly nodeId?: string;
  readonly name: string;
  readonly domain?: NumericDomain;
  readonly metric?: FactionMetricDefinition;
  readonly category: NodeType | "grudge" | "activation";
  readonly amount?: number;
  readonly isActive?: boolean;
  readonly previousValue?: number;
  readonly value?: number;
}

/** Reports always provide comparable readings and a sortable net amount. */
export interface ReportChange extends ChangeView {
  readonly nodeId: string;
  readonly domain: NumericDomain;
  readonly amount: number;
  readonly previousValue: number;
  readonly value: number;
  readonly relativeMagnitude: number;
}
