import type { ReactNode } from "react";
import { Clock3, History, ShieldAlert, ShieldCheck } from "lucide-react";
import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatSignedValue } from "@/ui/formatValue";
import { InstitutionOverview } from "./InstitutionOverview";
import { CrisisSummaryCard } from "./CrisisSummaryCard";
import { projectCrises } from "./projectGameOvers";

export type DashboardPanel = "overview" | "crises" | "chronicle";

interface DashboardSheetsProps {
  readonly activePanel?: DashboardPanel;
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly onClose: () => void;
  readonly onCrisisSelect: (crisisId: string) => void;
  readonly onResourceHover: (nodeId?: string) => void;
  readonly onResourceSelect: (nodeId: string) => void;
}

interface DashboardSheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly eyebrow?: string;
  readonly side?: "top" | "right" | "bottom" | "left";
  readonly headerBorder?: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

function DashboardSheet({
  open,
  title,
  description,
  eyebrow,
  side,
  headerBorder = false,
  onClose,
  children,
}: DashboardSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="sm:max-w-md"
        side={side}
        data-game-dashboard-sheet
      >
        <SheetHeader className={headerBorder ? "shrink-0 border-b" : undefined}>
          {eyebrow && (
            <span className="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
              {eyebrow}
            </span>
          )}
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {!headerBorder && <Separator />}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-4">{children}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardSheets({
  activePanel,
  scenario,
  state,
  resources,
  onClose,
  onCrisisSelect,
  onResourceHover,
  onResourceSelect,
}: DashboardSheetsProps) {
  const nodeDomains = new Map(
    scenario.nodes.map((node) => [node.id, node.domain]),
  );
  const crises = projectCrises(scenario, state);

  return (
    <>
      <DashboardSheet
        open={activePanel === "overview"}
        title={scenario.title}
        description="Institutional overview, stewardship resources, and active crises."
        eyebrow="Scenario"
        side="left"
        headerBorder
        onClose={onClose}
      >
        <InstitutionOverview
          scenario={scenario}
          state={state}
          resources={resources}
          compact
          hideScenario
          onCrisisSelect={onCrisisSelect}
          onResourceHover={onResourceHover}
          onResourceSelect={onResourceSelect}
        />
      </DashboardSheet>

      <DashboardSheet
        open={activePanel === "crises"}
        title="Crises"
        description="Recoverable trajectories that may become terminal Game Overs if their prerequisites persist."
        eyebrow={`${crises.length} ${crises.length === 1 ? "crisis" : "crises"}`}
        onClose={onClose}
      >
        {crises.length === 0 ? (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>No active crises</EmptyTitle>
              <EmptyDescription>
                No terminal trajectory currently requires intervention.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <section
            className="flex flex-col gap-3"
            aria-labelledby="active-crises-title"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert aria-hidden="true" />
              <h3 id="active-crises-title" className="font-heading text-lg">
                Active terminal crises
              </h3>
            </div>
            {crises.map((crisis) => (
              <CrisisSummaryCard
                key={crisis.definition.id}
                variant="compact"
                crisis={crisis}
                onOpen={() => {
                  onClose();
                  onCrisisSelect(crisis.definition.id);
                }}
              />
            ))}
          </section>
        )}
      </DashboardSheet>

      <DashboardSheet
        open={activePanel === "chronicle"}
        title="Chronicle"
        description="Recent institutional history and temporary effects still in force."
        eyebrow="Institutional ledger"
        onClose={onClose}
      >
        {state.history.length === 0 ? (
          <Empty className="min-h-64 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History />
              </EmptyMedia>
              <EmptyTitle>No recorded changes</EmptyTitle>
              <EmptyDescription>
                The chronicle begins when the first turn is completed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {[...state.history]
              .reverse()
              .slice(0, 8)
              .map((entry) => (
                <Item
                  role="listitem"
                  variant="muted"
                  key={entry.id}
                  data-game-chronicle-entry
                >
                  <Clock3 aria-hidden="true" />
                  <ItemContent>
                    <ItemTitle>{entry.title}</ItemTitle>
                    <ItemDescription>{entry.detail}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="outline">Turn {entry.turn}</Badge>
                  </ItemActions>
                </Item>
              ))}
          </ItemGroup>
        )}

        {state.grudges.length > 0 && (
          <section className="mt-6" aria-labelledby="temporary-effects-title">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck aria-hidden="true" />
              <h3
                id="temporary-effects-title"
                className="font-heading text-base"
              >
                Temporary effects
              </h3>
            </div>
            <ItemGroup>
              {state.grudges.map((grudge) => (
                <Item
                  role="listitem"
                  variant="outline"
                  size="sm"
                  key={grudge.id}
                >
                  <ItemContent>
                    <ItemTitle>{grudge.label}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Badge
                      variant={
                        grudge.magnitude < 0 ? "destructive" : "secondary"
                      }
                    >
                      {formatSignedValue(
                        grudge.magnitude,
                        nodeDomains.get(grudge.target),
                      )}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </section>
        )}
      </DashboardSheet>
    </>
  );
}
