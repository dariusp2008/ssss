import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { GrantedLogo } from "@/components/granted-logo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(search);
  const token = params.get("token");

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSuccess(data.message || "Parola a fost schimbată cu succes.");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setError(err.message || "Eroare la resetarea parolei");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolele nu coincid");
      return;
    }

    resetMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Link invalid</h1>
          <p className="text-muted-foreground text-sm">
            Linkul de resetare a parolei este invalid sau lipsește token-ul.
          </p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-back-to-login">
            Înapoi la autentificare
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <GrantedLogo size="lg" variant="navy" />
          </div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-reset-title">
            Setează parola nouă
          </h1>
          <p className="text-sm text-muted-foreground">
            Introdu noua parolă pentru contul tău
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-reset-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 text-sm" data-testid="text-reset-success">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span>{success}</span>
              <button
                type="button"
                className="block mt-2 text-primary font-medium hover:underline"
                onClick={() => setLocation("/auth")}
                data-testid="button-go-to-login"
              >
                Mergi la autentificare
              </button>
            </div>
          </div>
        )}

        {!success && (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Parola nouă</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minim 8 caractere"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-9"
                    data-testid="input-new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmă parola</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repetă parola nouă"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-9"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetMutation.isPending}
                data-testid="button-submit-reset"
              >
                {resetMutation.isPending ? "Se procesează..." : "Resetează parola"}
                {!resetMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => setLocation("/auth")}
            data-testid="button-back-auth"
          >
            Înapoi la autentificare
          </button>
        </div>
      </div>
    </div>
  );
}
