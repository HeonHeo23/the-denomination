import {
  Archive,
  ArrowRight,
  BookOpenText,
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
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface GameHeaderProps {
  readonly denominationName: string;
  readonly playerName: string;
  readonly scenarioTitle: string;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly canLoad: boolean;
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

const contiguousButton = "h-full rounded-none border-0 border-r px-2 sm:px-3";

function IdentityBlock({
  denominationName,
  playerName,
}: Pick<GameHeaderProps, "denominationName" | "playerName">) {
  return (
    <div className="min-w-0 flex-1 self-stretch px-1 py-2 sm:px-2 lg:max-w-sm xl:flex xl:h-full xl:w-80 xl:flex-none xl:flex-col xl:justify-center xl:border-r xl:bg-muted/20 xl:px-5 xl:py-0">
      <strong className="block truncate font-heading text-xl font-semibold leading-tight">
        {denominationName}
      </strong>
      <span className="block truncate text-xs text-muted-foreground">
        Led by {playerName}
      </span>
    </div>
  );
}

function ScenarioBlock({
  scenarioTitle,
}: Pick<GameHeaderProps, "scenarioTitle">) {
  return (
    <div className="hidden min-w-0 flex-1 self-stretch border-l px-3 py-2 lg:block xl:hidden">
      <span className="block font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground uppercase">
        Scenario
      </span>
      <strong className="block truncate font-heading text-lg font-semibold">
        {scenarioTitle}
      </strong>
    </div>
  );
}

function TurnDisplay({ state }: Pick<GameHeaderProps, "state">) {
  return (
    <div className="hidden h-full shrink-0 items-center gap-2 bg-primary/5 px-3 sm:flex">
      <span className="font-mono text-[0.55rem] tracking-tighter">
        {state.year === undefined ? "Turn" : "Year"}
      </span>
      <strong className="font-heading text-lg font-semibold text-primary sm:text-2xl">
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
    <div className="hidden h-full xl:flex">
      {resources.map((resource) => (
        <Badge
          className="h-full rounded-none border-0 border-l border-primary px-3 font-mono text-[0.65rem]"
          variant="secondary"
          key={resource.id}
        >
          {resource.name} {state.nodes[resource.id].value.toFixed(1)}
        </Badge>
      ))}
    </div>
  );
}

function PanelActions({
  onOpenSituations,
  onOpenChronicle,
}: Pick<GameHeaderProps, "onOpenSituations" | "onOpenChronicle">) {
  return (
    <div className="hidden h-full items-stretch border-l md:flex">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={contiguousButton}
        onClick={onOpenSituations}
        aria-label="Open situations"
        title="Situations"
      >
        <ShieldAlert data-icon="inline-start" />
        <span className="hidden sm:inline">Situations</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={contiguousButton}
        onClick={onOpenChronicle}
        aria-label="Open chronicle"
        title="Chronicle"
      >
        <BookOpenText data-icon="inline-start" />
        <span className="hidden sm:inline">Chronicle</span>
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
          variant={compact ? "outline" : "ghost"}
          size="icon-lg"
          className={cn(
            "h-full w-12 rounded-none border-0",
            compact && "ml-auto border-l",
          )}
        >
          <Menu />
          <span className="sr-only">
            {compact ? "Game actions" : "More game actions"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={musicMuted}
          onCheckedChange={onToggleMusic}
        >
          {musicMuted ? <VolumeX /> : <Volume2 />} Mute music
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {compact ? (
          <>
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuLabel>Panels</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onOpenSituations}>
                <ShieldAlert /> Situations
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenChronicle}>
                <BookOpenText /> Chronicle
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Game actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onSave}>
                <Save /> Save game
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onLoad} disabled={!canLoad}>
                <Archive /> Load saved game
              </DropdownMenuItem>
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
          </>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Game actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onReset}>
              <RotateCcw /> Reset simulation
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onMainMenu}>
              <Settings2 /> Main menu
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
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
    canLoad,
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
    <header className="h-16 shrink-0 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1800px] items-stretch gap-0 px-3 sm:px-4 xl:px-0">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(
            contiguousButton,
            "-ml-3 shrink-0 sm:-ml-4 xl:ml-0 xl:hidden",
          )}
          onClick={onOpenOverview}
          aria-label="Open institution overview"
          title="Institution overview"
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
          onOpenSituations={onOpenSituations}
          onOpenChronicle={onOpenChronicle}
        />
        <div className="ml-auto hidden h-full items-stretch border-l xl:flex">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={contiguousButton}
            onClick={onSave}
          >
            <Save data-icon="inline-start" />
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={contiguousButton}
            onClick={onLoad}
            disabled={!canLoad}
          >
            <Archive data-icon="inline-start" />
            Load
          </Button>
          <GameActionsMenu compact={false} {...actionProps} />
        </div>
        <div className="xl:hidden">
          <GameActionsMenu compact {...actionProps} />
        </div>
        <Button
          type="button"
          size="lg"
          className="-mr-3 flex h-full shrink-0 flex-col gap-0 rounded-none border-0 border-l px-3 text-base sm:-mr-4 sm:flex-row sm:gap-2 sm:px-5 xl:mr-0"
          onClick={onAdvance}
        >
          <span className="font-mono text-[0.55rem] tracking-[0.1em] uppercase sm:hidden">
            {state.year === undefined
              ? `Turn ${state.turn}`
              : `Year ${state.year}`}
          </span>
          <span className="flex items-center gap-2 sm:contents">
            <span className="hidden xl:inline">Advance turn</span>
            <span className="xl:hidden">Advance</span>
            <ArrowRight data-icon="inline-end" />
          </span>
        </Button>
      </div>
    </header>
  );
}
