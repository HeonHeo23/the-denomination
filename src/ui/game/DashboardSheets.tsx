import type { ReactNode } from "react";
import { Clock3, History, ShieldCheck } from "lucide-react";
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
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import { InstitutionOverview } from "./InstitutionOverview";

export type DashboardPanel = "overview" | "situations" | "chronicle";

interface DashboardSheetsProps {
  readonly activePanel?: DashboardPanel;
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly situations: readonly NodeDefinition[];
  readonly onClose: () => void;
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
  situations,
  onClose,
}: DashboardSheetsProps) {
  const nodeDomains = new Map(
    scenario.nodes.map((node) => [node.id, node.domain]),
  );

  return (
    <>
      <DashboardSheet
        open={activePanel === "overview"}
        title={scenario.title}
        description="Institutional overview, stewardship resources, and active situations."
        eyebrow="Scenario"
        side="left"
        headerBorder
        onClose={onClose}
      >
        <InstitutionOverview
          scenario={scenario}
          state={state}
          resources={resources}
          situations={situations}
          compact
          hideScenario
        />
      </DashboardSheet>

      <DashboardSheet
        open={activePanel === "situations"}
        title="Situations"
        description="Threshold-driven conditions currently being watched by the institution."
        onClose={onClose}
      >
        <ItemGroup>
          {situations.map((situation) => {
            const runtime = state.nodes[situation.id];
            return (
              <Item
                role="listitem"
                variant={runtime.isActive ? "outline" : "muted"}
                key={situation.id}
              >
                <ItemContent>
                  <ItemTitle>{situation.name}</ItemTitle>
                  <ItemDescription>{situation.description}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <div className="text-right">
                    <strong className="block font-mono text-sm">
                      {formatValue(runtime.value, situation.domain)}
                    </strong>
                    <Badge
                      variant={runtime.isActive ? "destructive" : "secondary"}
                    >
                      {runtime.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      </DashboardSheet>

      <DashboardSheet
        open={activePanel === "chronicle"}
        title="Chronicle"
        description="Recent institutional history and temporary effects still in force."
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
                <Item role="listitem" variant="muted" key={entry.id}>
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
