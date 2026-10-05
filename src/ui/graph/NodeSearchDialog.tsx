import { useMemo, useState } from "react";
import { FactionMetricIcon } from "@/ui/FactionMetric";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  filterNodeSearchEntries,
  type NodeSearchEntry,
} from "./projectNodeSearch";

interface NodeSearchDialogProps {
  readonly open: boolean;
  readonly entries: readonly NodeSearchEntry[];
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (entry: NodeSearchEntry) => void;
  readonly title?: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly emptyMessage?: string;
  readonly offBoardHeading?: string;
  readonly shortcut?: string;
}

function SearchResult({ entry }: { readonly entry: NodeSearchEntry }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="flex min-w-0 items-center gap-1.5 font-medium">
          {entry.factionMetric && (
            <FactionMetricIcon
              metric={entry.factionMetric.label}
              metricId={entry.factionMetric.id}
            />
          )}
          <span className="truncate">{entry.name}</span>
        </strong>
        <span className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="capitalize">
            {entry.factionCategory ?? entry.nodeType}
          </span>
          <span className="truncate">{entry.category}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        <Badge variant={entry.isActive ? "secondary" : "outline"}>
          {entry.isForced
            ? "Forced active"
            : entry.isActive
              ? "Active"
              : "Inactive"}
        </Badge>
        {!entry.isOnBoard && <Badge variant="outline">Off board</Badge>}
      </span>
    </>
  );
}

export function NodeSearchDialog({
  open,
  entries,
  onOpenChange,
  onSelect,
  title = "Search nodes",
  description = "Search every active, inactive, and off-board institutional node.",
  placeholder = "Search nodes by name, category, type, or status…",
  emptyMessage = "No institutional nodes found.",
  offBoardHeading = "Institutional index",
  shortcut,
}: NodeSearchDialogProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterNodeSearchEntries(entries, query),
    [entries, query],
  );
  const onBoard = results.filter((entry) => entry.isOnBoard);
  const offBoard = results.filter((entry) => !entry.isOnBoard);

  const setOpen = (nextOpen: boolean) => {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  };

  const selectEntry = (entry: NodeSearchEntry) => {
    setOpen(false);
    onSelect(entry);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={description}
      className="w-[calc(100%-2rem)] sm:max-w-2xl"
      showCloseButton
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={placeholder}
          aria-label={title}
          shortcut={shortcut}
        />
        <CommandList className="max-h-96">
          {results.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}
          {onBoard.length > 0 && (
            <CommandGroup heading="On board">
              {onBoard.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.id}
                  onSelect={() => selectEntry(entry)}
                >
                  <SearchResult entry={entry} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {offBoard.length > 0 && (
            <CommandGroup heading={offBoardHeading}>
              {offBoard.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.id}
                  onSelect={() => selectEntry(entry)}
                >
                  <SearchResult entry={entry} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
