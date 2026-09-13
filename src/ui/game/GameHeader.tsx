import {
  Archive,
  ArrowRight,
  BookOpenText,
  Church,
  Menu,
  PanelLeftOpen,
  RotateCcw,
  Save,
  ShieldAlert,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { NodeDefinition, SimulationState } from "@/simulation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatValue } from "@/ui/formatValue";

interface GameHeaderProps {
  readonly denominationName: string;
  readonly playerName: string;
  readonly scenarioTitle: string;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly activeSituationCount: number;
  readonly canLoad: boolean;
  readonly resolvingTurn: boolean;
  readonly onAdvance: () => void;
  readonly onSave: () => void;
  readonly onLoad: () => void;
  readonly onReset: () => void;
  readonly onMainMenu: () => void;
  readonly onOpenOverview: () => void;
  readonly onOpenSituations: () => void;
  readonly onOpenChronicle: () => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}

function IdentityBlock({
  denominationName,
  playerName,
}: Pick<GameHeaderProps, "denominationName" | "playerName">) {
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-3 self-stretch px-2 lg:max-w-sm xl:w-80 xl:flex-none xl:px-5"
      data-game-identity
    >
      <span
        className="hidden shrink-0 sm:grid"
        data-game-seal
        aria-hidden="true"
      >
        <Church />
      </span>
      <div className="flex min-w-0 flex-col justify-center">
        <strong className="truncate font-heading text-xl leading-tight font-semibold">
          {denominationName}
        </strong>
        <span className="truncate text-xs text-muted-foreground">
          In the care of {playerName}
        </span>
      </div>
    </div>
  );
}

function ScenarioBlock({
  scenarioTitle,
}: Pick<GameHeaderProps, "scenarioTitle">) {
  return (
    <div
      className="hidden min-w-0 flex-1 flex-col justify-center px-4 lg:flex xl:hidden"
      data-game-scenario
    >
      <span className="font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground uppercase">
        Scenario
      </span>
      <strong className="truncate font-heading text-lg font-semibold">
        {scenarioTitle}
      </strong>
    </div>
  );
}

function TurnDisplay({ state }: Pick<GameHeaderProps, "state">) {
  return (
    <div
      className="hidden h-full shrink-0 items-center gap-2 px-4 sm:flex"
      data-game-turn
    >
      <span className="font-mono text-[0.55rem] tracking-[0.14em] uppercase">
        {state.year === undefined ? "Turn" : "Year"}
      </span>
      <strong className="font-heading text-2xl leading-none font-semibold">
        {state.year ?? state.turn}
      </strong>
    </div>
  );
}

function ResourceStrip({
  resources,
  state,
}: Pick<GameHeaderProps, "resources" | "state">) {
  return (
    <dl className="hidden h-full items-stretch xl:flex" data-game-resources>
      {resources.map((resource) => (
        <div
          className="flex min-w-24 flex-col justify-center px-3"
          data-game-resource
          key={resource.id}
        >
          <dt className="truncate font-mono text-[0.52rem] tracking-[0.12em] uppercase">
            {resource.name}
          </dt>
          <dd className="font-heading text-lg leading-none font-semibold">
            {formatValue(state.nodes[resource.id].value, resource.domain)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PanelActions({
  activeSituationCount,
  onOpenSituations,
  onOpenChronicle,
}: Pick<
  GameHeaderProps,
  "activeSituationCount" | "onOpenSituations" | "onOpenChronicle"
>) {
  return (
    <div
      className="hidden h-full items-stretch md:flex"
      data-game-panel-actions
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-full rounded-none"
        data-game-header-button
        onClick={onOpenSituations}
        aria-label={`Open situations, ${activeSituationCount} active`}
      >
        <ShieldAlert data-icon="inline-start" />
        <span>Situations</span>
        {activeSituationCount > 0 && (
          <Badge variant="destructive">{activeSituationCount}</Badge>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-full rounded-none"
        data-game-header-button
        onClick={onOpenChronicle}
      >
        <BookOpenText data-icon="inline-start" />
        <span className="hidden lg:inline">Chronicle</span>
      </Button>
    </div>
  );
}

function GameActionsMenu({
  compact,
  canLoad,
  onLoad,
  onReset,
  onMainMenu,
  onOpenSituations,
  onOpenChronicle,
  onSave,
  musicMuted,
  onToggleMusic,
}: {
  readonly compact: boolean;
  readonly canLoad: boolean;
  readonly onLoad: () => void;
  readonly onReset: () => void;
  readonly onMainMenu: () => void;
  readonly onOpenSituations: () => void;
  readonly onOpenChronicle: () => void;
  readonly onSave: () => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className={cn("h-full rounded-none", compact && "ml-auto")}
          data-game-menu-trigger
        >
          <Menu />
          <span className="sr-only">Game actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {compact && (
          <>
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuLabel>Institution</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onOpenSituations}>
                <ShieldAlert /> Situations
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenChronicle}>
                <BookOpenText /> Chronicle
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="md:hidden" />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Record</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onSave}>
            <Save /> Save game
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onLoad} disabled={!canLoad}>
            <Archive /> Load saved game
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={musicMuted}
            onCheckedChange={onToggleMusic}
          >
            {musicMuted ? <VolumeX /> : <Volume2 />} Mute music
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onReset}>
            <RotateCcw /> Reset simulation
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMainMenu}>
            <Settings2 /> Main menu
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GameHeader(props: GameHeaderProps) {
  const {
    denominationName,
    playerName,
    scenarioTitle,
    state,
    resources,
    activeSituationCount,
    canLoad,
    resolvingTurn,
    onAdvance,
    onSave,
    onLoad,
    onReset,
    onMainMenu,
    onOpenOverview,
    onOpenSituations,
    onOpenChronicle,
    musicMuted,
    onToggleMusic,
  } = props;

  const actionProps = {
    canLoad,
    onLoad,
    onReset,
    onMainMenu,
    onOpenSituations,
    onOpenChronicle,
    onSave,
    musicMuted,
    onToggleMusic,
  };

  return (
    <header className="h-16 shrink-0" data-game-command-bar>
      <div className="mx-auto flex h-full max-w-[1800px] items-stretch px-3 sm:px-4 xl:px-0">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="-ml-3 h-full shrink-0 rounded-none sm:-ml-4 xl:ml-0 xl:hidden"
          data-game-overview-trigger
          onClick={onOpenOverview}
          aria-label="Open institution overview"
        >
          <PanelLeftOpen data-icon="inline-start" />
          <span className="hidden sm:inline">Overview</span>
        </Button>
        <IdentityBlock
          denominationName={denominationName}
          playerName={playerName}
        />
        <ScenarioBlock scenarioTitle={scenarioTitle} />
        <TurnDisplay state={state} />
        <ResourceStrip resources={resources} state={state} />
        <PanelActions
          activeSituationCount={activeSituationCount}
          onOpenSituations={onOpenSituations}
          onOpenChronicle={onOpenChronicle}
        />
        <GameActionsMenu compact {...actionProps} />
        <Button
          type="button"
          size="lg"
          className="-mr-3 flex h-full shrink-0 flex-col gap-0 rounded-none px-3 sm:-mr-4 sm:flex-row sm:gap-2 sm:px-5 xl:mr-0"
          data-game-advance
          onClick={onAdvance}
          disabled={resolvingTurn}
        >
          <span className="font-mono text-[0.52rem] tracking-[0.12em] uppercase sm:hidden">
            {state.year === undefined
              ? `Turn ${state.turn}`
              : `Year ${state.year}`}
          </span>
          <span className="flex items-center gap-2 sm:contents">
            <span className="hidden xl:inline">
              {resolvingTurn ? "Recording proceedings" : "Advance the year"}
            </span>
            <span className="xl:hidden">
              {resolvingTurn ? "Recording" : "Advance"}
            </span>
            <ArrowRight data-icon="inline-end" />
          </span>
        </Button>
      </div>
    </header>
  );
}
