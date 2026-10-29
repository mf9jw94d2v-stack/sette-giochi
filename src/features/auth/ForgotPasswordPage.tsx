import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/services/auth/authService";
import { useAuth } from "./authContext";
import {
  AccountsDisabled,
  AuthLayout,
  Field,
  FormMessage,
  SubmitButton,
  textLink,
} from "./AuthLayout";

export function ForgotPasswordPage() {
  const { status } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "disabled") return <AccountsDisabled />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const out = await requestPasswordReset(email);
    setBusy(false);
    if (!out.ok) setError(out.message);
    else setSent(true);
  }

  return (
    <AuthLayout
      title="Password dimenticata"
      intro="Scrivi l'email del tuo account: ti mandiamo un link per sceglierne una nuova."
      aside={null}
    >
      {sent ? (
        <div className="max-w-md space-y-4">
          {/* Same answer whether or not the email is registered. */}
          <FormMessage tone="success">
            Se <strong className="font-semibold">{email.trim()}</strong>{" "}
            corrisponde a un account, tra poco riceverai un link. Vale per un
            tempo limitato.
          </FormMessage>
          <Link to="/login" className={textLink}>
            Torna all&apos;accesso
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="max-w-md space-y-5">
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
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SubmitButton busy={busy} busyLabel="Invio…">
              Invia il link
            </SubmitButton>
            <Link to="/login" className={textLink}>
              Torna all&apos;accesso
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
