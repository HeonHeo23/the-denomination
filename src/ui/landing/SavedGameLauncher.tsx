import { ArrowRight } from "lucide-react";
import { getContinueGame, type SavedGameSummary } from "@/app/savedGames";
import type { LoadedScenarioCatalogEntry } from "@/app/scenarioCatalog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SavedGameLauncher({
  games,
  entries,
  lastLoadedGameId,
  onLoad,
}: {
  readonly games: readonly SavedGameSummary[];
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly lastLoadedGameId?: string;
  readonly onLoad: (id: string) => void;
}) {
  const recent = getContinueGame(games, lastLoadedGameId);
  if (!recent) return null;
  const scenarioTitle = (scenarioId?: string) =>
    entries.find(({ scenario }) => scenario.id === scenarioId)?.scenario
      .title ?? scenarioId;

  return (
    <Card className="shrink-0 gap-0 py-2" size="sm">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-2">
        <CardTitle className="min-w-0 flex-1 basis-32 wrap-break-word">
          {recent.denominationName ?? "Saved game"}
        </CardTitle>
        <Button type="button" size="sm" onClick={() => onLoad(recent.id)}>
          Continue
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardHeader>
      <CardContent className="px-2">
        <CardDescription className="flex flex-wrap gap-x-2 gap-y-1">
          <span>{scenarioTitle(recent.scenarioId)}</span>
          {recent.turn !== undefined && (
            <span>
              {recent.year === undefined ? "Turn" : "Year"}{" "}
              {recent.year ?? recent.turn}
            </span>
          )}
          {recent.savedAt && (
            <time dateTime={recent.savedAt}>
              Saved{" "}
              {new Date(recent.savedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
