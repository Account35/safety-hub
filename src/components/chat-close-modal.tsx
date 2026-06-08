import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ChatCloseModal({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Close This Conversation?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You will no longer be able to send messages, but you can still read your conversation
          history.
        </p>
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onConfirm} className="w-full bg-primary text-primary-foreground">
            Yes, Close Conversation
          </Button>
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
