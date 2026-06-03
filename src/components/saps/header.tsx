import { Link, useRouter } from "@tanstack/react-router";
import { Shield, LogOut, User as UserIcon, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n/en";
import { toast } from "sonner";

export function SapsHeader() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success(t.auth.signedOut);
    router.navigate({ to: "/" });
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Account";

  return (
    <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground"
          >
            <Shield className="size-5" />
          </span>
          <span className="hidden text-base sm:inline">{t.app.name}</span>
          <span className="text-base sm:hidden">CST</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-11 gap-2 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                >
                  <UserIcon className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.navigate({ to: "/dashboard" })}>
                  <Settings className="mr-2 size-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" /> {t.nav.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-medium sm:inline">
                Guest
              </span>
              <Button
                asChild
                size="sm"
                className="h-11 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth">{t.nav.signIn}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}