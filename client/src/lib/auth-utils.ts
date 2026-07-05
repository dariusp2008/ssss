export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message);
}

export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Sesiune expirată",
      description: "Te rugăm să te autentifici din nou.",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/auth";
  }, 500);
}
