import { CircleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmationKind = "new-game" | "main-menu";

interface ConfirmationDialogProps {
  readonly kind?: ConfirmationKind;
  readonly onConfirm: () => void;
  readonly onSaveAndExit?: () => void;
  readonly onCancel: () => void;
}

export function ConfirmationDialog({
  kind,
  onConfirm,
  onSaveAndExit,
  onCancel,
}: ConfirmationDialogProps) {
  const isReplacement = kind === "new-game";
  const isMainMenu = kind === "main-menu";

  return (
    <AlertDialog
      open={kind !== undefined}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-xl"
        onOutsideClick={() => onCancel()}
      >
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CircleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isReplacement
              ? "Begin a new history?"
              : "Return to the main menu?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left leading-relaxed">
            {isReplacement
              ? "Starting a new game will permanently replace the progress currently saved in this browser."
              : "Choose whether to save this game before returning to the main menu."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={
            isMainMenu ? "grid grid-cols-1" : "grid grid-cols-1 sm:grid-cols-2"
          }
        >
          <AlertDialogCancel className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug">
            Keep current game
          </AlertDialogCancel>
          {isMainMenu && onSaveAndExit && (
            <AlertDialogAction
              className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug"
              onClick={onSaveAndExit}
            >
              Save and main menu
            </AlertDialogAction>
          )}
          <AlertDialogAction
            className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug"
            variant="destructive"
            onClick={onConfirm}
          >
            {isReplacement ? "Start new game" : "Don’t save and go"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
