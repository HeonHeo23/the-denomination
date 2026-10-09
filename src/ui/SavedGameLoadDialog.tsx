import { useState } from "react";
import { defaultFilter } from "cmdk";
import { Trash2 } from "lucide-react";
import { getContinueGame, type SavedGameSummary } from "@/app/savedGames";
import type { LoadedScenarioCatalogEntry } from "@/app/scenarioCatalog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SavedGameLoadDialog({
  open,
  onOpenChange,
  games,
  entries,
  lastLoadedGameId,
  onLoad,
  onDelete,
  onReturnFocus,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly games: readonly SavedGameSummary[];
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly lastLoadedGameId?: string;
  readonly onLoad: (id: string) => string | undefined;
  readonly onDelete: (id: string) => boolean;
  readonly onReturnFocus: () => void;
}) {
  const [loadError, setLoadError] = useState<string>();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  }>();
  const [deleteError, setDeleteError] = useState<string>();
  const recent = getContinueGame(games, lastLoadedGameId);
  const scenarioTitle = (scenarioId?: string) =>
    entries.find(({ scenario }) => scenario.id === scenarioId)?.scenario
      .title ?? scenarioId;
  const rows = games.map((game) => ({
    ...game,
    name: game.denominationName?.trim() || "Saved game",
  }));
  const filtered = rows.filter(
    (row) =>
      defaultFilter(row.id, query, [
        row.name,
        row.playerName ?? "",
        scenarioTitle(row.scenarioId) ?? "",
      ]) > 0,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>Load game</DialogTitle>
          <DialogDescription>
            Choose a saved game to continue.
          </DialogDescription>
        </DialogHeader>
        <Command label="Saved games" className="min-h-0" shouldFilter={false}>
          <CommandInput
            placeholder="Find a saved game…"
            aria-label="Find a saved game"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No saved games found.</CommandEmpty>
            <CommandGroup heading="Saved games">
              {filtered.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <CommandItem
                    className="min-w-0 flex-1"
                    value={row.id}
                    data-checked={row.id === recent?.id}
                    aria-label={`Load ${row.name}`}
                    onSelect={() => {
                      const message = onLoad(row.id);
                      setLoadError(message);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium">{row.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {scenarioTitle(row.scenarioId)}
                        {row.playerName && ` · Led by ${row.playerName}`}
                        {row.name === "Saved game" && ` · ${row.id}`}
                      </span>
                      {row.turn !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {row.year === undefined
                            ? `Turn ${row.turn}`
                            : `Year ${row.year}`}
                        </span>
                      )}
                      {row.savedAt && (
                        <time
                          dateTime={row.savedAt}
                          className="text-xs text-muted-foreground"
                        >
                          Saved {new Date(row.savedAt).toLocaleString("en-US")}
                        </time>
                      )}
                    </div>
                  </CommandItem>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${row.name}`}
                    onKeyDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      setDeleteError(undefined);
                      setPendingDelete({ id: row.id, name: row.name });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        )}
        <AlertDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setPendingDelete(undefined);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete saved game?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete “{pendingDelete?.name}”? This permanently removes its
                saved progress.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(event) => {
                  if (!pendingDelete) return;
                  if (onDelete(pendingDelete.id)) setPendingDelete(undefined);
                  else {
                    event.preventDefault();
                    setDeleteError(
                      "The saved game could not be deleted. Please try again.",
                    );
                  }
                }}
              >
                Delete saved game
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
