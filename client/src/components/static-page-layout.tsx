import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ExternalLink, ArrowLeft, MessageCircle,
} from "lucide-react";
import { Link } from "wouter";
import { GrantedLogo } from "@/components/granted-logo";
import { ContactFormDialog } from "@/components/contact-form-dialog";

export default function StaticPageLayout({ children }: { children: React.ReactNode }) {
  const [showContact, setShowContact] = useState(false);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[hsl(228,100%,19.6%)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Înapoi</span>
              </button>
            </Link>
            <Link href="/">
              <div className="cursor-pointer">
                <GrantedLogo size="md" variant="gold" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="/auth">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">Autentificare</Button>
            </a>
            <a href="/auth" className="hidden sm:block">
              <Button size="sm" className="bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] hover:bg-[hsl(48,100%,45%)] font-semibold">Începe acum</Button>
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <footer className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(228, 100%, 19.6%) 0%, hsl(228, 100%, 14%) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[hsl(48,100%,50%)]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[hsl(48,100%,50%)]/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-5">
              <Link href="/">
                <div className="cursor-pointer">
                  <GrantedLogo size="lg" variant="gold" />
                </div>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                Ecosistemul tău complet pentru accesarea programelor de finanțare. De la identificare până la depunere.
              </p>
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-[hsl(48,100%,50%)] uppercase tracking-wider text-xs">Platformă</p>
              <div className="space-y-3">
                <a href="/#features" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Funcționalități
                </a>
                <a href="/#how-it-works" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Cum funcționează
                </a>
                <a href="/auth" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Autentificare
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-[hsl(48,100%,50%)] uppercase tracking-wider text-xs">Legal</p>
              <div className="space-y-3">
                <a href="/privacy-policy" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group" data-testid="link-privacy-policy">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Politica de confidențialitate
                </a>
                <a href="/terms-conditions" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group" data-testid="link-terms-conditions">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Termeni și condiții
                </a>
                <a href="/cookie-policy" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group" data-testid="link-cookie-policy">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Politica de cookie-uri
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-[hsl(48,100%,50%)] uppercase tracking-wider text-xs">Contact</p>
              <p className="text-sm text-white/50 leading-relaxed">
                Ai întrebări sau vrei să afli mai multe? Echipa noastră te poate ajuta.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/70 hover:text-white hover:border-[hsl(48,100%,50%)] hover:bg-[hsl(48,100%,50%)]/10 gap-2"
                onClick={() => setShowContact(true)}
                data-testid="button-footer-contact"
              >
                <MessageCircle className="w-4 h-4" />
                Contactează-ne
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 pb-2">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-6">
              <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[hsl(48,100%,50%)] transition-colors" data-testid="link-anpc">
                <ExternalLink className="w-3 h-3" />
                ANPC
              </a>
              <span className="text-white/15">|</span>
              <a href="https://eccromania.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[hsl(48,100%,50%)] transition-colors" data-testid="link-ecc">
                <ExternalLink className="w-3 h-3" />
                ECC România
              </a>
              <span className="text-white/15">|</span>
              <a href="https://consumer-redress.ec.europa.eu/index_en" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-[hsl(48,100%,50%)] transition-colors" data-testid="link-sol">
                <ExternalLink className="w-3 h-3" />
                SOL - Soluționarea Online a Litigiilor
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center text-center">
              <p className="text-xs text-white/30">&copy; 2026 GRANTED by STINDARD LOGIC TECHNOLOGY S.R.L. Toate drepturile rezervate.</p>
            </div>
          </div>
        </div>
      </footer>
      <ContactFormDialog open={showContact} onOpenChange={setShowContact} />
    </div>
  );
}
