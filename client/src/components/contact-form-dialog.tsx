import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Send, Info } from "lucide-react";
import { useRecaptcha, detectInAppBrowser, recaptchaErrorMessage } from "@/hooks/use-recaptcha";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: string;
}

export function ContactFormDialog({ open, onOpenChange, subject }: ContactFormDialogProps) {
  const { toast } = useToast();
  const { getToken } = useRecaptcha();
  const inAppInfo = useMemo(() => detectInAppBrowser(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setCompany("");
    setPhone("");
    setMessage("");
  };

  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; companyName: string; phone: string; message: string; subject?: string }) => {
      const captcha = await getToken("contact");
      if (!captcha.ok) {
        throw new Error(recaptchaErrorMessage(captcha.reason, inAppInfo.appName));
      }
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, recaptchaToken: captcha.token }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Eroare" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Mesaj trimis", description: data.message || "Te vom contacta in curand!" });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message || "Trimiterea a eșuat. Încearcă din nou.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contactează-ne</DialogTitle>
          <DialogDescription>
            Completează formularul și echipa noastră te va contacta în cel mai scurt timp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {inAppInfo.isInApp && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-100" data-testid="banner-contact-inapp">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Folosești browser-ul integrat din <strong>{inAppInfo.appName}</strong>. Dacă trimiterea eșuează, deschide pagina în Chrome / Safari și încearcă din nou.
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Nume *</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Ion Popescu"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email *</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: ion@firma.ro"
                data-testid="input-contact-email"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Companie</Label>
              <Input
                id="contact-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ex: SC Exemplu SRL"
                data-testid="input-contact-company-footer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Telefon</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex: 0740 123 456"
                data-testid="input-contact-phone-footer"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-message">Mesaj *</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cu ce te putem ajuta?"
              rows={3}
              data-testid="input-contact-message-footer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} data-testid="button-cancel-contact-footer">
            Anulează
          </Button>
          <Button
            onClick={() => {
              if (name.trim() && email.trim() && message.trim()) {
                contactMutation.mutate({
                  name: name.trim(),
                  email: email.trim(),
                  companyName: company.trim(),
                  phone: phone.trim(),
                  message: message.trim(),
                  subject: subject,
                });
              }
            }}
            disabled={contactMutation.isPending || !name.trim() || !email.trim() || !message.trim()}
            data-testid="button-send-contact-footer"
          >
            <Send className="w-4 h-4 mr-2" />
            {contactMutation.isPending ? "Se trimite..." : "Trimite mesajul"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
