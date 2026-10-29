import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel, when a section wants its own. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render crash so one broken component does not leave the player
 * looking at a blank page.
 *
 * We deliberately do NOT send the error anywhere: there is no telemetry in
 * this project (see docs/privacy-and-data.md). It goes to the browser console,
 * where the player's own devtools can see it, and the message is shown only in
 * development — in production a stack trace tells a player nothing and can
 * leak internals.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[errore di rendering]", error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <section
        role="alert"
        className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-12 text-center"
      >
        <h1 className="font-display text-xl font-bold">
          Qualcosa è andato storto
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questa parte della pagina non è riuscita a caricarsi. I tuoi risultati
          sono al sicuro: restano salvati nel browser.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            Riprova
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Torna alla home
          </a>
        </div>
      </section>
    );
  }
}
