import { Shield, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChatPrivacyModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 pb-2">
            <Shield className="size-10 text-accent" aria-hidden="true" />
            <DialogTitle className="text-center text-primary">
              Your Privacy is Protected
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          The SAPS officer in this conversation cannot see your name, phone number, or address.
          They can only see your anonymous report reference and your messages. You cannot see the
          officer&apos;s personal details either. Both sides are protected.
        </p>
        <Button onClick={onClose} className="mt-2 w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
