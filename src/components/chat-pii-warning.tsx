import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  detectedText: string;
  onEdit: () => void;
  onSendAnyway: () => void;
  onCancel: () => void;
}

export function ChatPiiWarningModal({ open, detectedText, onEdit, onSendAnyway, onCancel }: Props) {
  const [confirmStep, setConfirmStep] = useState(false);

  function handleClose() {
    setConfirmStep(false);
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm" onEscapeKeyDown={handleClose}>
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 pb-1">
            <AlertTriangle className="size-8 text-amber-500" aria-hidden="true" />
            <DialogTitle className="text-center">This Message May Reveal Your Identity</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center">
          We detected information that could identify you. Sharing personal details could
          compromise your anonymity.
        </p>
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 break-all">
          {detectedText}
        </div>
        {confirmStep ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">Are you sure? This cannot be undone.</p>
            <Button variant="destructive" className="w-full" onClick={() => { setConfirmStep(false); onSendAnyway(); }}>
              Yes, Send Anyway
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmStep(false)}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button className="w-full" onClick={() => { handleClose(); onEdit(); }}>
              Edit Message
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmStep(true)}>
              Send Anyway
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
