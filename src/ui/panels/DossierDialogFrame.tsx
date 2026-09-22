import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DossierDialogFrameProps {
  readonly open: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly surface: "node" | "crisis" | "game-over" | "chronicle";
  readonly header: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly footerClassName?: string;
  readonly showCloseButton?: boolean;
}

export function DossierDialogFrame({
  open,
  onOpenChange,
  surface,
  header,
  children,
  footer,
  footerClassName,
  showCloseButton = true,
}: DossierDialogFrameProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(780px,calc(100dvh-2rem))] min-h-0 w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton={showCloseButton}
        data-game-node-record={surface === "node" ? true : undefined}
        data-game-crisis-dossier={surface === "crisis" ? true : undefined}
        data-game-over-report={surface === "game-over" ? true : undefined}
        data-game-chronicle={surface === "chronicle" ? true : undefined}
      >
        <DialogHeader
          className="shrink-0 gap-3 px-6 pt-6"
          data-game-chronicle-header={
            surface === "chronicle" ? true : undefined
          }
        >
          {header}
        </DialogHeader>
        <Separator />
        {children}
        {footer !== undefined && (
          <>
            <Separator />
            <DialogFooter
              className={cn(
                "mx-0 mb-0 shrink-0 border-t-0 px-6 py-4",
                footerClassName,
              )}
            >
              {footer}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
