import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { t } from "@/lib/i18n/en";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Community Safety Tracker" },
      {
        name: "description",
        content: "Sign in or create an account to track reports and claim rewards.",
      },
    ],
  }),
  component: AuthPage,
});

const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[0-9]/, "Needs a number")
  .regex(/[^A-Za-z0-9]/, "Needs a special character");

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "At least 2 characters").max(100),
  email: z.string().email("Enter a valid email"),
  password: passwordRule,
});

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Medium", "Strong"] as const;
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}

function AuthPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "ready" && user) {
      router.navigate({ to: "/dashboard", replace: true });
    }
  }, [user, status, router]);

  return (
    <div className="grid min-h-dvh place-items-center bg-primary px-4 py-8 text-primary-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-primary-foreground/90">
          <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground">
            <Shield className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{t.app.name}</span>
        </Link>

        <div className="rounded-xl bg-card p-6 text-card-foreground shadow-xl">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in or create an account to track reports and claim rewards.
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t.auth.signInTab}</TabsTrigger>
              <TabsTrigger value="signup">{t.auth.signUpTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>

          <GoogleButton />
        </div>

        <p className="mt-6 text-center text-sm text-primary-foreground/80">
          <Link to="/" className="underline-offset-4 hover:underline">
            ← Continue as guest
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t.auth.or}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-11 w-full"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : t.auth.continueWithGoogle}
      </Button>
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path.join(".")] = i.message;
      });
      setErrors(fe);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.signedIn);
    router.navigate({ to: "/dashboard", replace: true });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        id="signin-email"
        label={t.auth.emailLabel}
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />
      <PasswordField
        id="signin-password"
        label={t.auth.passwordLabel}
        value={password}
        onChange={setPassword}
        show={show}
        toggle={() => setShow((s) => !s)}
        autoComplete="current-password"
        error={errors.password}
      />
      <Button type="submit" className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : t.auth.submitSignIn}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path.join(".")] = i.message;
      });
      setErrors(fe);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.accountCreated);
    router.navigate({ to: "/dashboard", replace: true });
  };

  const strengthColors = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-accent"];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        id="signup-name"
        label={t.auth.fullNameLabel}
        autoComplete="name"
        value={fullName}
        onChange={setFullName}
        error={errors.fullName}
      />
      <Field
        id="signup-email"
        label={t.auth.emailLabel}
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />
      <div className="space-y-2">
        <PasswordField
          id="signup-password"
          label={t.auth.passwordLabel}
          value={password}
          onChange={setPassword}
          show={show}
          toggle={() => setShow((s) => !s)}
          autoComplete="new-password"
          error={errors.password}
        />
        {password && (
          <div className="space-y-1">
            <div className="flex h-1.5 gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`flex-1 rounded ${i < strength.score ? strengthColors[strength.score] : "bg-muted"}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Strength: <span className="font-medium">{strength.label}</span> · 8+ chars, uppercase, number, symbol
            </p>
          </div>
        )}
      </div>
      <Button type="submit" className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : t.auth.submitSignUp}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-11"
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  toggle,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 pr-11"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded text-accent-foreground hover:bg-muted"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}