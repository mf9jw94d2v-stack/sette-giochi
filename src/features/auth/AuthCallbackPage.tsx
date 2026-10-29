import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { safeNextPath, verifyEmailLink } from "@/services/auth/authService";
import { useAuth } from "./authContext";
import { AccountsDisabled, AuthLayout, FormMessage } from "./AuthLayout";

const LINK_TYPES = [
  "signup",
  "email",
  "recovery",
  "invite",
  "email_change",
] as const;
type LinkType = (typeof LINK_TYPES)[number];

/**
 * Where links from emails (and Google sign-in) land. Two shapes are handled:
 *  - `?code=…`: PKCE; the Supabase client exchanges it by itself on load.
 *  - `?token_hash=…&type=…`: the email template recommended in
 *    docs/DEPLOYMENT.md, which also works when the link is opened in a
 *    different browser from the one used to sign up.
 */
export function AuthCallbackPage() {
  const { status, recovering } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get("next"));
  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const type = LINK_TYPES.find((t) => t === rawType) as LinkType | undefined;
  const linkError = params.get("error_description") ?? params.get("error");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (status === "disabled" || status === "loading" || linkError) return;
    if (tokenHash && type && !started.current && status === "signed-out") {
      started.current = true;
      void verifyEmailLink(tokenHash, type).then((out) => {
        if (!out.ok) setVerifyError(out.message);
      });
      return;
    }
    if (status === "signed-in") {
      const recovery = recovering || type === "recovery";
      navigate(recovery ? "/reset-password" : next, { replace: true });
    }
  }, [status, tokenHash, type, linkError, next, recovering, navigate]);

  if (status === "disabled") return <AccountsDisabled />;

  // Without a token hash, the PKCE exchange has already run by the time the
  // status settles: still signed out means the link did not work.
  const failed =
    linkError || verifyError || (status === "signed-out" && !tokenHash);

  return (
    <AuthLayout title={failed ? "Link non valido" : "Un momento…"} aside={null}>
      {failed ? (
        <div className="max-w-md space-y-4">
          <FormMessage tone="error">
            {verifyError ??
              "Il link non è valido o è scaduto. Ogni link vale una volta sola."}
          </FormMessage>
          <p className="text-sm text-muted-foreground">
            Se stavi confermando l&apos;email, prova ad{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              accedere
            </Link>
            : potresti averla già confermata.
          </p>
        </div>
      ) : (
        <p role="status" className="text-base text-muted-foreground">
          Sto completando l&apos;accesso.
        </p>
      )}
    </AuthLayout>
  );
}
