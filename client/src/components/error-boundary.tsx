import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Mesajele tipice când un chunk lazy (cod vechi) dispare de pe server după un
// deploy survenit în timpul sesiunii. Variază între browsere.
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|dynamically imported module|chunkloaderror|loading chunk \S+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? "";
  const message = (error as { message?: string }).message ?? String(error);
  return name === "ChunkLoadError" || CHUNK_ERROR_PATTERN.test(message);
}

// Reîncarcă pagina O SINGURĂ DATĂ la o eroare de chunk, cu guard anti-buclă:
// dacă tocmai am reîncărcat (< 10s), nu mai reîncărcăm — afișăm fallback-ul ca
// să nu intrăm într-o buclă de reload când eroarea persistă. După fereastra de
// guard, un chunk error nou (alt deploy) poate declanșa din nou un reload.
const RELOAD_TS_KEY = "chunk-reload-ts";
const RELOAD_GUARD_MS = 10_000;

export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || "0");
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponibil → reload best-effort fără guard.
  }
  window.location.reload();
  return true;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Un chunk lipsă (cod vechi după deploy) se rezolvă doar printr-un refresh
    // complet care aduce bundle-ul nou — resetul de state nu ajută.
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }

  handleRetry = () => {
    // Reload complet (nu doar reset de state): pentru chunk error resetul nu
    // rezolvă nimic; pentru orice altă eroare, un refresh reîncarcă curat pagina.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6 text-center" data-testid="error-boundary-fallback">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              {this.props.fallbackMessage ||
                (chunkError
                  ? "A apărut o versiune nouă a aplicației"
                  : "A apărut o eroare la încărcarea paginii")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {chunkError
                ? "Aplicația a fost actualizată între timp. Reîncarcă pagina pentru a încărca cea mai recentă versiune."
                : "Pagina nu a putut fi încărcată. Apasă butonul de mai jos pentru a reîncerca."}
            </p>
          </div>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2" data-testid="button-retry-page">
            <RefreshCw className="w-4 h-4" />
            Reîncarcă pagina
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
