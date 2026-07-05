import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, LogOut } from "lucide-react";
import { GrantedLogo } from "@/components/granted-logo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function AcceptPrivacyPage() {
  const [accepted, setAccepted] = useState(false);
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/accept-privacy"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-6">
        <GrantedLogo size="lg" variant="navy" />

        <div className="space-y-2">
          <h1 className="text-2xl font-serif font-bold" data-testid="text-privacy-title">
            Politica de Confidențialitate
          </h1>
          <p className="text-sm text-muted-foreground">
            Înainte de a continua, te rugăm să citești și să accepți politica noastră de confidențialitate.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-muted-foreground space-y-3" data-testid="text-privacy-content">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Shield className="w-4 h-4 text-primary" />
            <span>Politica de Confidențialitate GRANTED</span>
          </div>
          <p>
            GRANTED colectează și prelucrează datele personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR) - Regulamentul (UE) 2016/679.
          </p>
          <p>
            <strong>Date colectate:</strong> Numele, adresa de email, informații despre companie (CUI, cifra de afaceri, număr de angajați), documente încărcate pentru proiecte de finanțare.
          </p>
          <p>
            <strong>Scopul prelucrării:</strong> Evaluarea eligibilității companiei pentru programe de finanțare, gestionarea documentelor și monitorizarea progresului aplicațiilor.
          </p>
          <p>
            <strong>Durata stocării:</strong> Datele sunt păstrate pe durata utilizării platformei și pot fi șterse la cerere.
          </p>
          <p>
            <strong>Drepturile tale:</strong> Ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate și opoziție. Pentru exercitarea acestor drepturi, ne poți contacta la adresa de email de suport.
          </p>
          <p>
            <strong>Securitate:</strong> Datele tale sunt protejate prin măsuri tehnice și organizatorice adecvate, inclusiv criptare și control al accesului.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="privacy"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            data-testid="checkbox-privacy"
          />
          <label htmlFor="privacy" className="text-sm leading-snug cursor-pointer">
            Am citit și sunt de acord cu Politica de Confidențialitate și prelucrarea datelor mele personale conform GDPR.
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={!accepted || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
            data-testid="button-accept-privacy"
          >
            {acceptMutation.isPending ? "Se procesează..." : "Accept și continuă"}
          </Button>
          <Button
            variant="outline"
            onClick={() => logout()}
            data-testid="button-decline-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Refuz
          </Button>
        </div>
      </Card>
    </div>
  );
}
