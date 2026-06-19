import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Award, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmationStep({
  reportId,
  isAuthenticated,
}: {
  reportId: string;
  isAuthenticated: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/20 text-accent-foreground">
        <Award className="h-12 w-12 text-accent" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-primary">Report Submitted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you for helping keep your community safe.
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-2 rounded-md border-2 border-accent bg-accent/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your Reference
        </p>
        <p className="font-mono text-xl font-bold text-primary">{reportId}</p>
        <Button variant="outline" size="sm" onClick={copy} className="w-full">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Reference Number"}
        </Button>
      </div>

      <p className="mx-auto max-w-md text-xs text-muted-foreground">
        Save this reference number. If police need to contact you with follow-up questions, they will
        use this code. Your identity remains protected at all times.
      </p>

      {isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          This report has been added to your report history in your profile.
        </p>
      ) : (
        <p className="text-xs">
          <Link to="/auth" className="font-medium text-primary underline">
            Create a free account
          </Link>{" "}
          to track this report and receive updates.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/cases">Browse More Cases</Link>
        </Button>
        {isAuthenticated ? (
          <Button asChild variant="outline">
            <Link to="/profile/reports">View My Reports</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/cases">Report Another Case</Link>
          </Button>
        )}
      </div>
    </div>
  );
}