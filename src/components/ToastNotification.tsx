import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ToastNotificationProps {
  readonly message?: string;
  readonly onClose: () => void;
}

const TOAST_ID = "session-update";

/** A persistent session update: it stays visible until dismissed or superseded by a turn. */
export function ToastNotification({
  message,
  onClose,
}: ToastNotificationProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) {
      toast.dismiss(TOAST_ID);
      return;
    }

    toast.success("Session update", {
      id: TOAST_ID,
      description: message,
      position: "bottom-right",
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
      onDismiss: () => onCloseRef.current(),
    });
  }, [message]);

  return null;
}
