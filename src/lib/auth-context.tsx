import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "guest"
  | "user"
  | "detective"
  | "analyst"
  | "moderator"
  | "admin"
  | "super_admin";

export interface Profile {
  id: string;
  full_name: string;
  area: string | null;
}

interface AuthState {
  status: "loading" | "ready";
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfileAndRoles(userId: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, area").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        // Defer DB calls to avoid deadlock with auth callback
        setTimeout(() => {
          if (!mounted) return;
          loadProfileAndRoles(newSession.user.id).then(({ profile, roles }) => {
            if (!mounted) return;
            setProfile(profile);
            setRoles(roles);
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const { profile, roles } = await loadProfileAndRoles(data.session.user.id);
        if (!mounted) return;
        setProfile(profile);
        setRoles(roles);
      }
      setStatus("ready");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      hasRole: (role) => roles.includes(role),
      refresh: async () => {
        if (!session?.user) return;
        const { profile, roles } = await loadProfileAndRoles(session.user.id);
        setProfile(profile);
        setRoles(roles);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [status, session, profile, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}