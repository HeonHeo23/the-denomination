import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  Church,
  Map,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { SavedGame } from "@/app/persistence";
import type { LoadedScenarioCatalogEntry } from "@/app/scenarioCatalog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToastNotification } from "@/components/ToastNotification";
import { useInterfaceSound } from "@/ui/sound/interfaceSoundContext";
import "./landing.css";

export interface LandingErrors {
  readonly scenario?: string;
  readonly playerName?: string;
  readonly denominationName?: string;
}

interface LandingPageProps {
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly savedGame?: SavedGame;
  readonly selectedScenarioId: string;
  readonly playerName: string;
  readonly denominationName: string;
  readonly notice?: string;
  readonly errors: LandingErrors;
  readonly onScenarioChange: (id: string) => void;
  readonly onPlayerNameChange: (name: string) => void;
  readonly onDenominationNameChange: (name: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onLoad: () => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}

export function LandingPage({
  entries,
  savedGame,
  selectedScenarioId,
  playerName,
  denominationName,
  notice,
  errors,
  onScenarioChange,
  onPlayerNameChange,
  onDenominationNameChange,
  onSubmit,
  onLoad,
  musicMuted,
  onToggleMusic,
}: LandingPageProps) {
  const interfaceSound = useInterfaceSound();
  const [dismissedNotice, setDismissedNotice] = useState<string>();
  const selected = entries.find(
    ({ scenario }) => scenario.id === selectedScenarioId,
  );
  const savedEntry = savedGame
    ? entries.find(({ scenario }) => scenario.id === savedGame.scenarioId)
    : undefined;
  const visibleNotice = notice !== dismissedNotice ? notice : undefined;

  return (
    <main className="landing-cover h-dvh overflow-hidden px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
      <div className="mx-auto flex h-full min-h-0 max-w-[1520px] flex-col">
        <header className="flex items-center gap-3 border-b border-primary-foreground/20 pb-5 text-primary-foreground">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <Church aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <strong className="font-heading text-3xl leading-none">
                The Denomination
              </strong>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 gap-1" data-game-audio-settings>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleMusic}
              aria-pressed={musicMuted}
            >
              {musicMuted ? <VolumeX /> : <Volume2 />}
              <span className="sr-only sm:not-sr-only">Music</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={interfaceSound.toggle}
              aria-pressed={interfaceSound.muted}
            >
              {interfaceSound.muted ? <BellOff /> : <Bell />}
              <span className="sr-only sm:not-sr-only">Effect sounds</span>
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 items-center gap-8 overflow-hidden py-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,500px)] lg:gap-12 lg:py-8 xl:gap-20">
          <section className="max-w-3xl text-primary-foreground">
            <h1 className="mt-5 max-w-3xl font-heading text-[clamp(3.5rem,7.5vw,7rem)] leading-none font-semibold tracking-tight text-wrap">
              {denominationName.trim() || "One, Holy, Catholic, and Apostolic"}
            </h1>
            <p className="mt-8 max-w-xl leading-8 text-primary-foreground/70">
              Guide an institution through the decisions that become a legacy.
              <br />
              Hold together conviction, trust, practice, and the people who
              carry them.
            </p>
            <div className="mt-8 hidden flex-wrap gap-x-8 gap-y-3 text-xs text-primary-foreground/65 sm:flex">
              <span>Doctrine</span>
              <span>Stewardship</span>
              <span>Community</span>
            </div>
          </section>

          <section
            className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto overscroll-contain"
            aria-label="Begin a game"
          >
            {savedGame && savedEntry && (
              <Card
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
                size="sm"
              >
                <CardHeader className="min-w-0 gap-0.5 px-0 py-0">
                  <CardTitle className="truncate text-base leading-tight">
                    {savedGame.denominationName}
                  </CardTitle>
                  <CardDescription className="truncate text-xs leading-tight">
                    {savedEntry.scenario.title} · Led by {savedGame.playerName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid justify-items-center gap-0 px-0 text-center">
                  <span className="font-mono text-[0.6rem] tracking-wider text-muted-foreground uppercase">
                    {savedGame.state.year === undefined ? "Turn" : "Year"}
                  </span>
                  <strong className="font-heading text-lg leading-none">
                    {savedGame.state.year ?? savedGame.state.turn}
                  </strong>
                </CardContent>
                <CardFooter className="shrink-0 rounded-none border-0 bg-transparent p-0">
                  <Button type="button" size="sm" onClick={onLoad}>
                    Continue
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            <Card data-game-launch-document>
              <CardHeader>
                <CardTitle>Found an institution</CardTitle>
              </CardHeader>
              <Separator />
              <form onSubmit={onSubmit} noValidate>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(errors.scenario)}>
                      <FieldLabel htmlFor="scenario">Scenario</FieldLabel>
                      <Select
                        value={selectedScenarioId}
                        onValueChange={onScenarioChange}
                      >
                        <SelectTrigger
                          className="w-full"
                          id="scenario"
                          aria-invalid={Boolean(errors.scenario)}
                        >
                          <SelectValue placeholder="Choose a scenario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {entries.map(({ scenario }) => (
                              <SelectItem value={scenario.id} key={scenario.id}>
                                {scenario.title}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.scenario}</FieldError>
                    </Field>

                    {selected && (
                      <section
                        data-game-scenario-briefing
                        aria-labelledby="scenario-briefing-title"
                      >
                        <span>
                          <Map aria-hidden="true" />
                        </span>
                        <div className="scenario-briefing__summary">
                          <h2 id="scenario-briefing-title">
                            {selected.scenario.title}
                          </h2>
                          <p>{selected.scenario.description}</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Opening year</dt>
                            <dd>
                              {selected.scenario.start.year ??
                                `Turn ${selected.scenario.start.turn}`}
                            </dd>
                          </div>
                          <div>
                            <dt>Board pieces</dt>
                            <dd>
                              {
                                selected.scenario.nodes.filter(
                                  (node) => node.graphVisible !== false,
                                ).length
                              }
                            </dd>
                          </div>
                          <div>
                            <dt>Categories</dt>
                            <dd>
                              {
                                new Set(
                                  selected.scenario.nodes
                                    .map((node) => node.category)
                                    .filter(Boolean),
                                ).size
                              }
                            </dd>
                          </div>
                        </dl>
                      </section>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field data-invalid={Boolean(errors.playerName)}>
                        <FieldLabel htmlFor="player-name">Your name</FieldLabel>
                        <Input
                          id="player-name"
                          value={playerName}
                          onChange={(event) =>
                            onPlayerNameChange(event.target.value)
                          }
                          placeholder="Jesus Christ"
                          maxLength={40}
                          autoComplete="name"
                          aria-invalid={Boolean(errors.playerName)}
                          required
                        />
                        <FieldError>{errors.playerName}</FieldError>
                      </Field>
                      <Field data-invalid={Boolean(errors.denominationName)}>
                        <FieldLabel htmlFor="denomination-name">
                          Denomination name
                        </FieldLabel>
                        <Input
                          id="denomination-name"
                          value={denominationName}
                          onChange={(event) =>
                            onDenominationNameChange(event.target.value)
                          }
                          placeholder="The Church"
                          maxLength={60}
                          aria-invalid={Boolean(errors.denominationName)}
                          required
                        />
                        <FieldError>{errors.denominationName}</FieldError>
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="mt-5">
                  <Button className="w-full" type="submit" size="lg">
                    Start a new game
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/20 pt-5 font-mono text-[0.65rem] tracking-wider text-primary-foreground/50 uppercase">
          <span>© 2026 Heon Heo</span>
          <a
            className="text-secondary hover:underline"
            href="https://heonheo23.github.io"
            target="_blank"
            rel="noreferrer"
          >
            heonheo23.github.io
          </a>
        </footer>
      </div>
      <ToastNotification
        message={visibleNotice}
        onClose={() => setDismissedNotice(visibleNotice)}
      />
    </main>
  );
}
