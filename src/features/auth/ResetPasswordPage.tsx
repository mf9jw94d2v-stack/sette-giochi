import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PASSWORD_MIN_LENGTH,
  updatePassword,
} from "@/services/auth/authService";
import { useAuth } from "./authContext";
import {
  AccountsDisabled,
  AuthLayout,
  FormMessage,
  PasswordField,
  SubmitButton,
  textLink,
} from "./AuthLayout";

/**
 * Reached from the recovery email. The link signs the player in for this one
 * purpose; without that session there is nothing to reset.
 */
export function ResetPasswordPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status === "disabled") return <AccountsDisabled />;
  if (status === "loading")
    return (
      <p
        role="status"
        className="py-16 text-center text-sm text-muted-foreground"
      >
        Controllo del link…
      </p>
    );

  if (status === "signed-out" && !done) {
    return (
      <AuthLayout title="Link non valido" aside={null}>
        <div className="max-w-md space-y-4">
          <p className="text-base leading-relaxed">
            Il link per reimpostare la password non è valido o è scaduto. Ogni
            link vale una volta sola e per un tempo limitato.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Richiedi un nuovo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
      );
      return;
    }
    if (password !== repeat) {
      setError("Le due password non coincidono.");
      return;
    }
    setBusy(true);
    const out = await updatePassword(password);
    setBusy(false);
    if (!out.ok) setError(out.message);
    else setDone(true);
  }

  return (
    <AuthLayout title="Scegli una nuova password" aside={null}>
      {done ? (
        <div className="max-w-md space-y-4">
          <FormMessage tone="success">
            Password aggiornata. Da ora accedi con quella nuova.
          </FormMessage>
          <button
            type="button"
            onClick={() => navigate("/")}
            className={textLink}
          >
            Vai alla home
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="max-w-md space-y-5">
          <PasswordField
            label="Nuova password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Almeno ${PASSWORD_MIN_LENGTH} caratteri.`}
          />
          <PasswordField
            label="Ripeti la nuova password"
            name="repeat-password"
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <SubmitButton busy={busy} busyLabel="Salvataggio…">
            Salva la password
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
