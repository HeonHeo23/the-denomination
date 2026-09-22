import {
  Archive,
  ArrowRight,
  BookOpenText,
  Church,
  FileText,
  Menu,
  PanelLeftOpen,
  RotateCcw,
  Save,
  ShieldAlert,
  Settings2,
  Bell,
  BellOff,
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
import { formatValue } from "@/ui/formatValue";
import { useInterfaceSound } from "@/ui/sound/interfaceSoundContext";
import { crisisTurnsLabel } from "./crisisPresentation";

interface GameHeaderProps {
  readonly denominationName: string;
  readonly playerName: string;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly activeCrisisCount: number;
  readonly urgentGameOverWarning?: {
    readonly title: string;
    readonly turnsRemaining: number;
  };
  readonly gameOver: boolean;
  readonly canLoad: boolean;
  readonly resolvingTurn: boolean;
  readonly onAdvance: () => void;
  readonly onSave: () => void;
  readonly onLoad: () => void;
  readonly onReset: () => void;
  readonly onMainMenu: () => void;
  readonly onOpenOverview: () => void;
  readonly onOpenCrises: () => void;
  readonly onOpenChronicle: () => void;
  readonly turnReportAvailable: boolean;
  readonly onOpenTurnReport: () => void;
  readonly onOpenGameOver: () => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}

type GameHeaderActions = Pick<
  GameHeaderProps,
  | "onSave"
  | "onLoad"
  | "onReset"
  | "onMainMenu"
  | "onOpenCrises"
  | "onOpenChronicle"
  | "turnReportAvailable"
  | "onOpenTurnReport"
>;

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
  activeCrisisCount,
  urgentGameOverWarning,
  onOpenCrises,
  onOpenChronicle,
  turnReportAvailable,
  onOpenTurnReport,
}: Pick<
  GameHeaderProps,
  | "activeCrisisCount"
  | "urgentGameOverWarning"
  | "onOpenCrises"
  | "onOpenChronicle"
  | "turnReportAvailable"
  | "onOpenTurnReport"
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
        onClick={onOpenCrises}
        aria-label={
          urgentGameOverWarning
            ? `Open crises, ${urgentGameOverWarning.title} has ${crisisTurnsLabel(urgentGameOverWarning.turnsRemaining)} remaining`
            : `Open crises, ${activeCrisisCount} active`
        }
      >
        <ShieldAlert data-icon="inline-start" />
        <span>Crises</span>
        {urgentGameOverWarning ? (
          <Badge variant="destructive">
            {crisisTurnsLabel(urgentGameOverWarning.turnsRemaining)}
          </Badge>
        ) : activeCrisisCount > 0 ? (
          <Badge variant="destructive">{activeCrisisCount}</Badge>
        ) : null}
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
      {turnReportAvailable && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-full rounded-none"
          data-game-header-button
          onClick={onOpenTurnReport}
          aria-label="Review the completed turn report"
        >
          <FileText data-icon="inline-start" />
          <span className="hidden lg:inline">Turn report</span>
        </Button>
      )}
    </div>
  );
}

function RecordActions({
  canLoad,
  onSave,
  onLoad,
}: Pick<GameHeaderProps, "canLoad" | "onSave" | "onLoad">) {
  return (
    <div
      className="hidden h-full items-stretch lg:flex"
      data-game-record-actions
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-full rounded-none"
        data-game-header-button
        onClick={onSave}
      >
        <Save data-icon="inline-start" />
        <span>Save</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-full rounded-none"
        data-game-header-button
        onClick={onLoad}
        disabled={!canLoad}
      >
        <Archive data-icon="inline-start" />
        <span>Load</span>
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
  onOpenCrises,
  onOpenChronicle,
  turnReportAvailable,
  onOpenTurnReport,
  onSave,
  musicMuted,
  onToggleMusic,
  interfaceSoundsMuted,
  onToggleInterfaceSounds,
}: GameHeaderActions & {
  readonly compact: boolean;
  readonly canLoad: boolean;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
  readonly interfaceSoundsMuted: boolean;
  readonly onToggleInterfaceSounds: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="h-full rounded-none"
          data-game-menu-trigger
        >
          <Menu />
          <span className="sr-only">Game actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {compact && (
          <>
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuLabel>Institution</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onOpenCrises}>
                <ShieldAlert /> Crises
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenChronicle}>
                <BookOpenText /> Chronicle
              </DropdownMenuItem>
              {turnReportAvailable && (
                <DropdownMenuItem onSelect={onOpenTurnReport}>
                  <FileText /> Turn report
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="md:hidden" />
          </>
        )}
        <DropdownMenuGroup className="lg:hidden">
          <DropdownMenuLabel>Record</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onSave}>
            <Save /> Save game
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onLoad} disabled={!canLoad}>
            <Archive /> Load saved game
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="lg:hidden" />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={musicMuted}
            onCheckedChange={onToggleMusic}
          >
            {musicMuted ? <VolumeX /> : <Volume2 />} Mute music
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={interfaceSoundsMuted}
            onCheckedChange={onToggleInterfaceSounds}
          >
            {interfaceSoundsMuted ? <BellOff /> : <Bell />} Mute effect sounds
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
  const interfaceSound = useInterfaceSound();
  const {
    denominationName,
    playerName,
    state,
    resources,
    activeCrisisCount,
    urgentGameOverWarning,
    gameOver,
    canLoad,
    resolvingTurn,
    onAdvance,
    onSave,
    onLoad,
    onReset,
    onMainMenu,
    onOpenOverview,
    onOpenCrises,
    onOpenChronicle,
    turnReportAvailable,
    onOpenTurnReport,
    onOpenGameOver,
    musicMuted,
    onToggleMusic,
  } = props;

  const actionProps = {
    canLoad,
    onLoad,
    onReset,
    onMainMenu,
    onOpenCrises,
    onOpenChronicle,
    turnReportAvailable,
    onOpenTurnReport,
    onSave,
    musicMuted,
    onToggleMusic,
    interfaceSoundsMuted: interfaceSound.muted,
    onToggleInterfaceSounds: interfaceSound.toggle,
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
        <TurnDisplay state={state} />
        <ResourceStrip resources={resources} state={state} />
        <PanelActions
          activeCrisisCount={activeCrisisCount}
          urgentGameOverWarning={urgentGameOverWarning}
          onOpenCrises={onOpenCrises}
          onOpenChronicle={onOpenChronicle}
          turnReportAvailable={turnReportAvailable}
          onOpenTurnReport={onOpenTurnReport}
        />
        {urgentGameOverWarning && !gameOver && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-full rounded-none md:hidden"
            data-game-header-button
            onClick={onOpenCrises}
            aria-label={`Open crises: ${urgentGameOverWarning.title} has ${crisisTurnsLabel(urgentGameOverWarning.turnsRemaining)} remaining before Game Over`}
          >
            <ShieldAlert data-icon="inline-start" />
            <Badge variant="destructive">
              {urgentGameOverWarning.turnsRemaining}
            </Badge>
          </Button>
        )}
        <div className="ml-auto flex h-full items-stretch">
          <RecordActions canLoad={canLoad} onSave={onSave} onLoad={onLoad} />
          <GameActionsMenu compact {...actionProps} />
        </div>
        <Button
          type="button"
          size="lg"
          className="-mr-3 flex h-full shrink-0 flex-col gap-0 rounded-none px-3 sm:-mr-4 sm:flex-row sm:gap-2 sm:px-5 xl:mr-0"
          data-game-advance
          onClick={gameOver ? onOpenGameOver : onAdvance}
          disabled={resolvingTurn && !gameOver}
        >
          <span className="font-mono text-[0.52rem] tracking-[0.12em] uppercase sm:hidden">
            {gameOver
              ? "Game over"
              : state.year === undefined
                ? `Turn ${state.turn}`
                : `Year ${state.year}`}
          </span>
          <span className="flex items-center gap-2 sm:contents">
            <span className="hidden xl:inline">
              {gameOver
                ? "View final report"
                : resolvingTurn
                  ? "Recording proceedings"
                  : "Advance the year"}
            </span>
            <span className="xl:hidden">
              {gameOver
                ? "Final report"
                : resolvingTurn
                  ? "Recording"
                  : "Advance"}
            </span>
            {gameOver ? (
              <ShieldAlert data-icon="inline-end" />
            ) : (
              <ArrowRight data-icon="inline-end" />
            )}
          </span>
        </Button>
      </div>
    </header>
  );
}
