import eventPlaceholder from "@/assets/event-placeholder.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemGroup } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChangeItem } from "@/ui/panels/ChangeItem";
import type { EventView } from "./projectEvent";
import "@/ui/panels/panels.css";

interface EventDetailDialogProps {
  readonly event: EventView;
  readonly onOpenChange: (open: boolean) => void;
  readonly onNodeSelect: (nodeId: string) => void;
}

export default function EventDetailDialog({
  event,
  onOpenChange,
  onNodeSelect,
}: EventDetailDialogProps) {
  const date =
    event.year === undefined ? `Turn ${event.turn}` : `Year ${event.year}`;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)]"
        data-game-event-detail
      >
        <img
          src={eventPlaceholder}
          alt=""
          aria-hidden="true"
          className="h-36 w-full object-cover sm:h-full sm:min-h-0"
        />
        <div className="flex min-h-0 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <DialogHeader className="gap-2 pr-6">
                <Badge variant="outline" className="w-fit">
                  Event · {date} · {event.triggerCount}
                </Badge>
                <DialogTitle>{event.definition.title}</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {event.definition.description}
                </DialogDescription>
              </DialogHeader>

              <section
                className="flex flex-col gap-3"
                aria-labelledby="event-consequences-title"
              >
                {event.changes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No direct consequence was recorded.
                  </p>
                ) : (
                  <ItemGroup className="gap-2">
                    {event.changes.map((change) => (
                      <ChangeItem
                        key={change.id}
                        change={change}
                        source="event"
                        onNodeSelect={onNodeSelect}
                      />
                    ))}
                  </ItemGroup>
                )}
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-popover p-4 sm:p-5">
            <DialogClose asChild>
              <Button type="button">Continue</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
