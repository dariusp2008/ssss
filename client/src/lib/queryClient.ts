import { QueryClient, QueryFunction } from "@tanstack/react-query";

const FALLBACK_MESSAGES: Record<number, string> = {
  502: "Un serviciu extern nu este disponibil momentan. Vă rugăm să încercați din nou în câteva minute.",
  503: "Serviciul este temporar indisponibil. Vă rugăm să încercați din nou în câteva minute.",
  500: "A apărut o eroare neașteptată. Vă rugăm să încercați din nou.",
  504: "Cererea a durat prea mult. Vă rugăm să încercați din nou.",
};

function looksLikeTechnicalError(message: string): boolean {
  return /stack trace|at \w+\.|Error:|ECONNR|ETIMEDOUT|\.js:\d+|\.ts:\d+|undefined is not|Cannot read prop/i.test(message);
}

function enhanceErrorMessage(message: string, status: number): string {
  if (looksLikeTechnicalError(message)) {
    return FALLBACK_MESSAGES[status] || FALLBACK_MESSAGES[500]!;
  }
  if ((status === 502 || status === 503) && !message.includes("încercați") && !message.includes("Încercați")) {
    return message + " Vă rugăm să încercați din nou în câteva minute.";
  }
  return message;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) message = parsed.message;
    } catch {}
    message = enhanceErrorMessage(message, res.status);
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).isExternalServiceError = res.status === 502 || res.status === 503;
    (err as any).quota = (() => { try { return JSON.parse(text).quota; } catch { return undefined; } })();
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
