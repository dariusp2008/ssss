import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Shield, TrendingUp, FileCheck, ArrowRight, CheckCircle2, Sparkles,
  BarChart3, Users, Globe, Brain, ChevronRight, Building2, Zap,
  ExternalLink, MapPin, MessageCircle,
} from "lucide-react";
import { GrantedLogo } from "@/components/granted-logo";
import { ContactFormDialog } from "@/components/contact-form-dialog";

const features = [
  {
    icon: Shield,
    title: "Evaluare Rapidă",
    desc: "Introdu CUI-ul și verifică instant eligibilitatea companiei tale pentru toate apelurile de finanțare active. Analiză automată a codurilor CAEN, cifrei de afaceri și numărului de angajați.",
  },
  {
    icon: TrendingUp,
    title: "Identificare Automată",
    desc: "Algoritmul nostru identifică instant programele de finanțare compatibile cu profilul tău, cu scor de potrivire detaliat pe criterii.",
  },
  {
    icon: Brain,
    title: "Analiză AI de Eligibilitate",
    desc: "Ghidurile de finanțare sunt analizate cu inteligență artificială. Primești un verdict detaliat cu punctaj, criterii îndeplinite și recomandări personalizate.",
  },
  {
    icon: FileCheck,
    title: "Panou de Control Documente",
    desc: "Gestionează întreaga documentație într-un singur loc. Încarcă fișiere, primește alerte pentru datele de expirare și urmărește stadiul aplicației pas cu pas.",
  },
  {
    icon: Users,
    title: "Colaborare în Echipă",
    desc: "Invită consultanți și colegi în proiectele tale. Adaugă comentarii pe documente, gestionează versiuni și urmărește progresul împreună.",
  },
  {
    icon: Globe,
    title: "Catalog de Finanțări",
    desc: "Acces la sute de apeluri de finanțare, actualizate automat. Filtrează după categorie, buget, termen limită și sursă de finanțare.",
  },
];

const steps = [
  {
    step: "01",
    title: "Verifică Compania",
    desc: "Introdu CUI-ul pentru a extrage automat datele financiare și a evalua eligibilitatea firmei tale.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Descoperă Oportunități",
    desc: "Vizualizează apelurile potrivite profilului tău și analizează eligibilitatea cu ajutorul AI.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Aplică și Monitorizează",
    desc: "Pregătește documentația, colaborează cu echipa și urmărește progresul dosarului tău.",
    icon: FileCheck,
  },
];

const stats = [
  { value: "500+", label: "Apeluri monitorizate" },
  { value: "24/7", label: "Acces la platforma" },
  { value: "AI", label: "Analiză inteligentă" },
  { value: "100%", label: "Date oficiale" },
];

export default function LandingPage() {
  const [showContact, setShowContact] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[hsl(228,100%,19.6%)]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center" data-testid="text-logo">
            <GrantedLogo size="md" variant="gold" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors" data-testid="link-features">Funcționalități</a>
            <a href="#how-it-works" className="hover:text-white transition-colors" data-testid="link-how-it-works">Cum funcționează</a>
            <a href="#stats" className="hover:text-white transition-colors" data-testid="link-stats">De ce GRANTED</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/auth">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hidden sm:inline-flex" data-testid="button-login">Autentificare</Button>
            </a>
            <a href="/auth">
              <Button size="sm" className="bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] hover:bg-[hsl(48,100%,45%)] font-semibold text-xs sm:text-sm" data-testid="button-get-started">Începe acum</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-16 overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(228, 100%, 19.6%) 0%, hsl(228, 80%, 28%) 50%, hsl(228, 60%, 35%) 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[hsl(48,100%,50%)]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[hsl(48,100%,50%)]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/10 text-[hsl(48,100%,50%)] text-xs sm:text-sm font-medium border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                Ecosistemul tău pentru programe de finanțare
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight text-white">
                Accesează programe de finanțare
                <br />
                <span className="text-[hsl(48,100%,50%)]">Cu Încredere</span>
              </h1>
              <p className="text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">
                GRANTED simplifică procesul de căutare și aplicare pentru programele de finanțare.
                Efectuează pre-evaluarea companiei, identifică apelurile eligibile și gestionează întreaga aplicație.
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <a href="/auth">
                  <Button size="lg" className="bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] hover:bg-[hsl(48,100%,45%)] font-bold text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 shadow-lg shadow-[hsl(48,100%,50%)]/20" data-testid="button-hero-cta">
                    Începe acum <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
                  </Button>
                </a>
                <a href="#how-it-works" className="hidden sm:inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  Află cum funcționează <ChevronRight className="w-4 h-4" />
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 sm:pt-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/60">
                  <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,50%)]" />
                  Simplu si rapid
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/60">
                  <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,50%)]" />
                  Ghidare pas cu pas
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/60">
                  <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[hsl(48,100%,50%)]" />
                  Analiză AI inclusă
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 space-y-6 shadow-2xl">
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] text-xs font-bold">
                  LIVE DEMO
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/50">Scor de eligibilitate</p>
                    <p className="text-4xl font-bold text-[hsl(48,100%,50%)]">87%</p>
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-[hsl(48,100%,50%)]/10 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-[hsl(48,100%,50%)]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-white/50">Criterii companie</span>
                    <span className="font-medium text-emerald-400">Indeplinite</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(48,100%,50%)] to-[hsl(48,100%,60%)]" style={{ width: "87%" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-1">
                    <p className="text-xs text-white/40">Apeluri potrivite</p>
                    <p className="text-2xl font-bold text-white">12</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-1">
                    <p className="text-xs text-white/40">Proiecte active</p>
                    <p className="text-2xl font-bold text-white">3</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      <section id="stats" className="py-10 sm:py-16 px-4 sm:px-6 -mt-8 sm:-mt-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4 sm:p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <BarChart3 className="w-3.5 h-3.5" />
              Funcționalități
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-tight">
              Tot ce ai nevoie pentru
              <span className="text-primary"> programe de finanțare</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              De la verificarea companiei până la gestionarea documentelor, GRANTED acoperă întregul ciclu de finanțare.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group p-4 sm:p-6 space-y-3 sm:space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 hover:border-primary/20">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-[hsl(48,100%,50%)]/20 transition-colors">
                  <f.icon className="w-5 sm:w-6 h-5 sm:h-6 text-primary group-hover:text-[hsl(48,100%,50%)] transition-colors" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6" style={{ background: "linear-gradient(180deg, hsl(228, 100%, 19.6%) 0%, hsl(228, 80%, 25%) 100%)" }}>
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[hsl(48,100%,50%)] text-xs sm:text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              Proces simplu
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-tight text-white">
              Cum funcționează
            </h2>
            <p className="text-white/60 text-base sm:text-lg">
              Trei pași simpli pentru a începe accesarea programelor de finanțare.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden sm:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[hsl(48,100%,50%)]/20 via-[hsl(48,100%,50%)]/40 to-[hsl(48,100%,50%)]/20" />

            {steps.map((item) => (
              <div key={item.step} className="relative text-center space-y-4 sm:space-y-5">
                <div className="relative mx-auto w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-[hsl(48,100%,50%)] flex items-center justify-center shadow-lg shadow-[hsl(48,100%,50%)]/20">
                  <item.icon className="w-6 sm:w-8 h-6 sm:h-8 text-[hsl(228,100%,19.6%)]" />
                  <div className="absolute -top-2 -right-2 w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-white text-[hsl(228,100%,19.6%)] flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-md">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-xs sm:text-sm text-white/60 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-2 sm:pt-4">
            <a href="/auth">
              <Button size="lg" className="bg-[hsl(48,100%,50%)] text-[hsl(228,100%,19.6%)] hover:bg-[hsl(48,100%,45%)] font-bold text-sm sm:text-base px-8 sm:px-10 h-11 sm:h-12 shadow-lg shadow-[hsl(48,100%,50%)]/20">
                Începe acum <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(228, 100%, 19.6%) 0%, hsl(228, 100%, 14%) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[hsl(48,100%,50%)]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[hsl(48,100%,50%)]/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6 sm:pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 mb-8 sm:mb-12">
            <div className="space-y-5">
              <GrantedLogo size="lg" variant="gold" />
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                Ecosistemul tău complet pentru accesarea programelor de finanțare. De la identificare până la depunere.
              </p>
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-[hsl(48,100%,50%)] uppercase tracking-wider text-xs">Platformă</p>
              <div className="space-y-3">
                <a href="#features" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group">
                  <ChevronRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Funcționalități
                </a>
                <a href="#how-it-works" className="flex items-center gap-2 text-sm text-white/60 hover:text-[hsl(48,100%,50%)] transition-colors group">
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
