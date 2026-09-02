import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Back control that returns to the actual previous page in history.
 * Falls back to a given route when there is no history entry
 * (direct link, refresh, new tab).
 */
export function BackButton({
  fallbackTo = "/profile",
  label = "Go back",
  onBack,
}: {
  fallbackTo?: string;
  label?: string;
  onBack?: () => void;
}) {
  const router = useRouter();

  function handleClick() {
    if (onBack) {
      onBack();
      return;
    }
    let canGoBack = false;
    try {
      canGoBack =
        router.history.canGoBack() ||
        (typeof window !== "undefined" && window.history.length > 1);
    } catch {
      canGoBack = typeof window !== "undefined" && window.history.length > 1;
    }
    if (canGoBack) router.history.back();
    else router.navigate({ to: fallbackTo, replace: true });
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} aria-label={label} tabIndex={0}>
      <ArrowLeft className="size-5" />
    </Button>
  );
}
