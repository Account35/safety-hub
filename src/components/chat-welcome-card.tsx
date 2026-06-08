import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onDismiss: () => void;
  onLearnMore: () => void;
}

export function ChatWelcomeCard({ onDismiss, onLearnMore }: Props) {
  return (
    <div className="rounded-xl bg-primary p-4 text-primary-foreground mb-4" role="note">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="size-5 text-accent shrink-0" aria-hidden="true" />
        <span className="font-semibold text-sm">Secure SAPS Communication</span>
      </div>
      <ul className="text-xs space-y-1 mb-3 list-none pl-0">
        <li>• The officer cannot see your identity — only your report reference code</li>
        <li>• You cannot see the officer&apos;s personal details</li>
        <li>• All messages are encrypted for your security</li>
      </ul>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onDismiss}>
          Got It
        </Button>
        <Button size="sm" variant="ghost" className="text-accent" onClick={onLearnMore}>
          Learn More
        </Button>
      </div>
    </div>
  );
}
