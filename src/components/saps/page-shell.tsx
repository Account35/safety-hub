import type { ReactNode } from "react";
import { SapsHeader } from "./header";
import { BottomNav } from "./bottom-nav";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SapsHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}