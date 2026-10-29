import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  resendConfirmation,
  safeNextPath,
  signIn,
  signInWithGoogle,
  isGoogleEnabled,
} from "@/services/auth/authService";
import type { AuthErrorCode } from "@/services/auth/errors";
import { useAuth } from "./authContext";
import {
  AccountsDisabled,
  AuthLayout,
  Field,
  FormMessage,
  PasswordField,
  SubmitButton,
  textLink,
} from "./AuthLayout";

export function LoginPage() {
  const { status, sessionExpired, dismissExpired } = useAuth();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    code: AuthErrorCode;
    message: string;
  } | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  // Already signed in (or just signed in): go where the player was heading.
  useEffect(() => {
    if (status === "signed-in") navigate(next, { replace: true });
  }, [status, next, navigate]);

  if (status === "disabled") return <AccountsDisabled />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResent(null);
    const out = await signIn(email, password);
    setBusy(false);
    if (!out.ok) {
      setError({ code: out.code, message: out.message });
      return;
    }
    dismissExpired();
  }

  async function resend() {
    const out = await resendConfirmation(email);
    setResent(
      out.ok ? "Ti abbiamo inviato di nuovo il link di conferma." : out.message,
    );
  }

  return (
    <AuthLayout
      title="Accedi"
      intro="Entra nel tuo account per ritrovare risultati e classifiche su ogni dispositivo."
    >
      {sessionExpired && (
        <div className="mb-6">
          <FormMessage tone="info">
            La sessione è scaduta. Accedi di nuovo per continuare a salvare nel
            tuo account.
          </FormMessage>
        </div>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <FormMessage tone="error">
            {error.message}
            {error.code === "email_not_confirmed" && email && (
              <>
                {" "}
                <button type="button" onClick={resend} className={textLink}>
                  Invia di nuovo il link
                </button>
              </>
            )}
          </FormMessage>
        )}
        {resent && <FormMessage tone="info">{resent}</FormMessage>}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SubmitButton
            busy={busy || status === "loading"}
            busyLabel="Accesso…"
          >
            Accedi
          </SubmitButton>
          <Link to="/forgot-password" className={textLink}>
            Password dimenticata?
          </Link>
        </div>
      </form>

      {isGoogleEnabled() && (
        <div className="mt-8 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => void signInWithGoogle(next)}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card px-5 text-base font-medium hover:bg-accent sm:w-auto"
          >
            Continua con Google
          </button>
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Non hai un account?{" "}
        <Link
          to={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className={textLink}
        >
          Creane uno
        </Link>
        . Oppure{" "}
        <Link to="/" className={textLink}>
          continua come ospite
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
