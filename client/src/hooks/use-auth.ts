import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { User } from "@shared/models/auth";

type SafeUser = Omit<User, "passwordHash" | "verificationToken" | "verificationTokenExpiresAt" | "resetPasswordToken" | "resetPasswordExpiresAt">;

// Preview-only auth bypass. When VITE_PREVIEW_AUTH === "true" (e.g. a static
// Vercel deploy with no backend), useAuth returns this fake user so every
// authenticated page renders. Never enable in a real environment.
const PREVIEW_AUTH = import.meta.env.VITE_PREVIEW_AUTH === "true";

const PREVIEW_USER: SafeUser = {
  id: "preview-user",
  email: "preview@granted.ro",
  firstName: "Preview",
  lastName: "User",
  role: "super_admin",
  profileImage: null,
  emailVerified: true,
  privacyAcceptedAt: new Date(),
  consentAiProcessing: true,
  consentEmailMarketing: false,
  consentThirdPartySharing: false,
  subscriptionPlanId: null,
  creditBalance: 999,
  stripeCustomerId: null,
  lastActiveAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function fetchUser(): Promise<SafeUser | null> {
  if (PREVIEW_AUTH) {
    return PREVIEW_USER;
  }

  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, isLoading } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    queryClient.clear();
    queryClient.removeQueries();
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch {}
    }
    window.location.replace("/");
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut,
  };
}
