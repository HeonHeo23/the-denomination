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

interface ConfirmationDialogProps {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onSaveAndExit?: () => void;
  readonly onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  onConfirm,
  onSaveAndExit,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return <AlertDialog open={false} />;

  return (
    <AlertDialog
      open={open}
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
          <AlertDialogTitle>Return to the main menu?</AlertDialogTitle>
          <AlertDialogDescription className="text-left leading-relaxed">
            Choose whether to save this game before returning to the main menu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-1">
          <AlertDialogCancel className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug">
            Keep current game
          </AlertDialogCancel>
          {onSaveAndExit && (
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
            Don’t save and go
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
